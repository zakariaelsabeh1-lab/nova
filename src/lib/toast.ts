import toast from 'react-hot-toast'

// Centralized toast styling so every mutation feedback looks consistent.
const base = {
  style: {
    background: '#0f172a',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 600,
    padding: '10px 14px',
  },
}

export const notifySuccess = (msg: string) =>
  toast.success(msg, { ...base, iconTheme: { primary: '#22c55e', secondary: '#0f172a' } })

export const notifyError = (msg: string) =>
  toast.error(msg, { ...base, iconTheme: { primary: '#ef4444', secondary: '#0f172a' } })

export const notifyLoading = (msg: string) => toast.loading(msg, base)

export const dismissToast = (id: string) => toast.dismiss(id)

// Extracts a friendly message from a Supabase/plan-limit error.
export function errorMessage(e: unknown, fallback = 'Something went wrong'): string {
  let msg = ''
  if (e instanceof Error) {
    msg = e.message
  } else if (typeof e === 'string') {
    msg = e
  } else if (e && typeof e === 'object') {
    // Supabase/PostgREST errors are plain objects, not Error instances.
    const o = e as { message?: unknown; details?: unknown; hint?: unknown }
    const parts = [o.message, o.details, o.hint].filter((p): p is string => typeof p === 'string' && p.length > 0)
    msg = parts.join(' — ')
  }
  if (msg.includes('PLAN_LIMIT:')) return msg.split('PLAN_LIMIT:')[1].trim()
  return msg || fallback
}

export { toast }
