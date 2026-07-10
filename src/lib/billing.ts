import { supabase } from '@/lib/supabase'

// Calls the serverless checkout endpoint and redirects to Stripe Checkout.
export async function startCheckout(workspaceId: string, interval: 'monthly' | 'annual') {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const res = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
    body: JSON.stringify({ workspaceId, interval }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Checkout failed')
  const { url } = await res.json()
  if (url) window.location.href = url
  return url as string
}

// Opens the Stripe customer portal for managing the subscription.
export async function openBillingPortal(workspaceId: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const res = await fetch('/api/create-portal-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
    body: JSON.stringify({ workspaceId }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Could not open billing portal')
  const { url } = await res.json()
  if (url) window.location.href = url
  return url as string
}
