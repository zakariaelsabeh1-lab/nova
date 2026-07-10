import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { stripe, supabaseAdmin, readRawBody } from './_utils'

// Disable Vercel's body parser so we can verify the raw payload signature.
export const config = { api: { bodyParser: false } }

async function setPlan(
  workspaceId: string,
  patch: { plan?: 'free' | 'pro'; status?: string; stripe_subscription_id?: string | null; current_period_end?: string | null }
) {
  await supabaseAdmin.from('subscriptions').upsert(
    { workspace_id: workspaceId, ...patch, updated_at: new Date().toISOString() },
    { onConflict: 'workspace_id' }
  )
}

async function workspaceForCustomer(customerId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('workspace_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return data?.workspace_id ?? null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const sig = req.headers['stripe-signature'] as string | undefined
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !secret) return res.status(400).json({ error: 'Missing signature' })

  let event: Stripe.Event
  try {
    const raw = await readRawBody(req)
    event = stripe.webhooks.constructEvent(raw, sig, secret)
  } catch (e) {
    return res.status(400).json({ error: `Signature verification failed: ${e instanceof Error ? e.message : ''}` })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const workspaceId = session.metadata?.workspace_id
        if (workspaceId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          await setPlan(workspaceId, {
            plan: 'pro',
            status: subscription.status,
            stripe_subscription_id: subscription.id,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
        }
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const workspaceId =
          subscription.metadata?.workspace_id ?? (await workspaceForCustomer(subscription.customer as string))
        if (workspaceId) {
          const active = subscription.status === 'active' || subscription.status === 'trialing'
          await setPlan(workspaceId, {
            plan: active ? 'pro' : 'free',
            status: subscription.status,
            stripe_subscription_id: subscription.id,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
        }
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const workspaceId =
          subscription.metadata?.workspace_id ?? (await workspaceForCustomer(subscription.customer as string))
        if (workspaceId) {
          await setPlan(workspaceId, { plan: 'free', status: 'canceled', stripe_subscription_id: null })
        }
        break
      }
      default:
        break
    }
    return res.status(200).json({ received: true })
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Webhook handler failed' })
  }
}
