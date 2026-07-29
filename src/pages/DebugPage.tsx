import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TEMPLATES } from '@/lib/templates'

declare const __BUILD_ID__: string

interface Row {
  label: string
  value: string
  ok: boolean | null
}

// Self-diagnostic page (/debug). Shows which build is actually deployed and the
// raw result of every query the app depends on, so a stale deployment or a
// database/RLS problem is obvious at a glance without DevTools.
export function DebugPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState(true)

  useEffect(() => {
    ;(async () => {
      const out: Row[] = []
      const push = (label: string, value: unknown, ok: boolean | null = null) =>
        out.push({ label, value: typeof value === 'string' ? value : JSON.stringify(value), ok })

      // 1. Which build is live
      const buildId = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'unknown'
      push('Build (commit · time)', buildId, true)

      // 2. Does this build contain the new templates? (proves stale vs fresh)
      const names = TEMPLATES.map((t) => t.label)
      push('Templates in this build', `${names.length}: ${names.join(', ')}`, names.length >= 9)
      push(
        'Vacation has Manager column',
        String(Boolean(TEMPLATES.find((t) => t.key === 'vacation')?.columns.some((c) => c.name === 'Manager'))),
        Boolean(TEMPLATES.find((t) => t.key === 'vacation')?.columns.some((c) => c.name === 'Manager'))
      )

      // 3. Supabase project + session
      push('Supabase URL', import.meta.env.VITE_SUPABASE_URL ?? '(missing)', Boolean(import.meta.env.VITE_SUPABASE_URL))
      const keyRaw = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? ''
      push('Anon key type', keyRaw.startsWith('eyJ') ? 'legacy JWT (eyJ…)' : keyRaw ? 'new (sb_…)' : '(missing)', Boolean(keyRaw))

      const { data: sess } = await supabase.auth.getSession()
      const uid = sess.session?.user?.id ?? null
      push('Signed in as', sess.session?.user?.email ?? 'NOT SIGNED IN', Boolean(uid))
      push('User id', uid ?? '—', Boolean(uid))

      if (uid) {
        // 4. Profile row
        const p = await supabase.from('profiles').select('id,email').eq('id', uid).maybeSingle()
        push('Profile row', p.error ? `ERROR: ${p.error.message}` : p.data ? 'exists' : 'MISSING', !p.error && Boolean(p.data))

        // 5. The exact query the app uses to find your workspaces
        const wm = await supabase.from('workspace_members').select('role, workspace:workspace_id(id,name)').eq('user_id', uid)
        push(
          'Memberships (drives routing)',
          wm.error ? `ERROR: ${wm.error.message}` : `${wm.data?.length ?? 0} → ${JSON.stringify(wm.data)}`,
          !wm.error && (wm.data?.length ?? 0) > 0
        )

        // 6. Workspaces readable directly
        const ws = await supabase.from('workspaces').select('id,name,owner_id')
        push('Workspaces readable', ws.error ? `ERROR: ${ws.error.message}` : `${ws.data?.length ?? 0} → ${JSON.stringify(ws.data)}`, !ws.error)

        // 7. Invite auto-join function present?
        const rpc = await supabase.rpc('redeem_invites')
        push(
          'redeem_invites() RPC',
          rpc.error ? `MISSING/ERROR: ${rpc.error.message}` : `ok, joined ${rpc.data ?? 0}`,
          !rpc.error
        )

        // 8. Pending invites visible?
        const inv = await supabase.from('invites').select('email,role,used')
        push('Invites readable', inv.error ? `ERROR: ${inv.error.message}` : `${inv.data?.length ?? 0} → ${JSON.stringify(inv.data)}`, !inv.error)
      }

      setRows(out)
      setBusy(false)
    })()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', padding: 24, fontFamily: 'ui-monospace, monospace' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Nova diagnostics</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 20 }}>
          Screenshot this whole page and send it. It shows which build is live and what the database returns.
        </p>
        {busy && <p style={{ color: '#38bdf8' }}>Running checks…</p>}
        <div style={{ display: 'grid', gap: 8 }}>
          {rows.map((r) => (
            <div
              key={r.label}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${r.ok === false ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 12,
                padding: '10px 14px',
              }}
            >
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>
                {r.ok === false ? '✗ ' : r.ok ? '✓ ' : ''}
                {r.label}
              </div>
              <div style={{ fontSize: 13, color: r.ok === false ? '#fca5a5' : '#e2e8f0', wordBreak: 'break-all', marginTop: 3 }}>
                {r.value}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
          <button
            onClick={() => {
              try {
                localStorage.clear()
                sessionStorage.clear()
              } catch {
                /* ignore */
              }
              window.location.href = '/login'
            }}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: '#fff',
              background: 'linear-gradient(135deg,#ef4444,#b91c1c)',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
            }}
          >
            Force sign out &amp; clear everything
          </button>
          <a
            href="/"
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              textDecoration: 'none',
            }}
          >
            Back to app
          </a>
        </div>
      </div>
    </div>
  )
}
