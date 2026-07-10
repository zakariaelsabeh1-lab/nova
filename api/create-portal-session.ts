import type { VercelRequest, VercelResponse } from '@vercel/node'
import { stripe, supabaseAdmin, getUser, assertWorkspaceAdmin, APP_URL } from './_utils'

// POST { workspaceId } → { url } — opens the Stripe customer portal.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user = await getUser(req)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const { workspaceId } = req.body as { workspaceId: string }
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' })
    if (!(await assertWorkspaceAdmin(user.id, workspaceId)))
      return res.status(403).json({ error: 'Only workspace admins can manage billing' })

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (!sub?.stripe_customer_id) return res.status(400).json({ error: 'No billing account yet' })

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${APP_URL}/billing`,
    })

    return res.status(200).json({ url: session.url })
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Portal failed' })
  }
}
