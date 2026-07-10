import type { VercelRequest, VercelResponse } from '@vercel/node'
import { stripe, supabaseAdmin, getUser, assertWorkspaceAdmin, PRICE_IDS, APP_URL } from './_utils'

// POST { workspaceId, interval: 'monthly' | 'annual' } → { url }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user = await getUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const { workspaceId, interval = 'monthly' } = req.body as { workspaceId: string; interval?: 'monthly' | 'annual' }
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' })
    if (!(await assertWorkspaceAdmin(user.id, workspaceId)))
      return res.status(403).json({ error: 'Only workspace admins can manage billing' })

    const price = PRICE_IDS[interval] || PRICE_IDS.monthly
    if (!price) return res.status(500).json({ error: 'Stripe price not configured' })

    // reuse an existing customer if we have one
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    let customerId = sub?.stripe_customer_id ?? undefined
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { workspace_id: workspaceId, user_id: user.id },
      })
      customerId = customer.id
      await supabaseAdmin.from('subscriptions').upsert(
        { workspace_id: workspaceId, stripe_customer_id: customerId },
        { onConflict: 'workspace_id' }
      )
    }

    // count seats = members, so per-seat pricing is accurate
    const { count } = await supabaseAdmin
      .from('workspace_members')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price, quantity: Math.max(1, count ?? 1) }],
      allow_promotion_codes: true,
      success_url: `${APP_URL}/billing?checkout=success`,
      cancel_url: `${APP_URL}/billing?checkout=cancelled`,
      metadata: { workspace_id: workspaceId },
      subscription_data: { metadata: { workspace_id: workspaceId } },
    })

    return res.status(200).json({ url: session.url })
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Checkout failed' })
  }
}
