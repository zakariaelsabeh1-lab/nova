import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import type { VercelRequest } from '@vercel/node'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
})

// Service-role client — bypasses RLS so the webhook can update subscriptions.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { persistSession: false } }
)

export const PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_MONTHLY ?? '',
  annual: process.env.STRIPE_PRICE_ANNUAL ?? '',
}

export const APP_URL = process.env.APP_URL ?? 'http://localhost:5173'

// Reads the Bearer token and returns the authenticated Supabase user, or null.
export async function getUser(req: VercelRequest) {
  const auth = req.headers.authorization
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  const { data } = await supabaseAdmin.auth.getUser(token)
  return data.user ?? null
}

// Confirms the user is an admin of the workspace (mutations require admin).
export async function assertWorkspaceAdmin(userId: string, workspaceId: string) {
  const { data } = await supabaseAdmin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle()
  return data?.role === 'admin'
}

// Reads the raw request body (needed for Stripe signature verification).
export function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}
