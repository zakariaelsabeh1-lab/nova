import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Sparkles, Check, Loader2, CreditCard, Crown } from 'lucide-react'
import { useCurrentWorkspaceId, usePlan, useMembers } from '@/lib/db/workspaces'
import { useWorkspaceBoards } from '@/lib/db/boards'
import { supabase } from '@/lib/supabase'
import { PLAN_LIMITS, PRO_PRICE_MONTHLY } from '@/lib/plan'
import { startCheckout, openBillingPortal } from '@/lib/billing'
import { notifyError, errorMessage } from '@/lib/toast'

function useStorageUsed(workspaceId: string | null) {
  return useQuery({
    queryKey: ['storage-used', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data } = await supabase.from('files').select('size_bytes').eq('workspace_id', workspaceId!)
      return (data ?? []).reduce((s, f) => s + (f.size_bytes ?? 0), 0)
    },
  })
}

export function BillingPage() {
  const workspaceId = useCurrentWorkspaceId()
  const { limits, subscription, isPro } = usePlan(workspaceId)
  const { data: boards = [] } = useWorkspaceBoards(workspaceId)
  const { data: members = [] } = useMembers(workspaceId)
  const { data: storageUsed = 0 } = useStorageUsed(workspaceId)
  const [busy, setBusy] = useState<string | null>(null)

  const act = async (fn: () => Promise<unknown>, key: string) => {
    if (!workspaceId) return
    setBusy(key)
    try {
      await fn()
    } catch (e) {
      notifyError(errorMessage(e))
      setBusy(null)
    }
  }

  const fmtBytes = (b: number) => (b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${(b / 1e6).toFixed(0)} MB`)

  return (
    <div className="h-full overflow-y-auto bg-[#f1f5f9]">
      <div className="max-w-[820px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-[24px] font-bold text-[#0f172a] tracking-tight">Billing & Plan</h1>
          <p className="text-[14px] text-[#64748b] mt-1">Manage your subscription and monitor usage.</p>
        </div>

        {/* Current plan card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 mb-6 relative overflow-hidden"
          style={{ background: isPro ? 'linear-gradient(135deg, #0f172a, #1e1b4b)' : '#fff', border: isPro ? 'none' : '1px solid #e2e8f0' }}
        >
          {isPro && <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full" style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.2) 0%, transparent 70%)' }} />}
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isPro && <Crown className="w-5 h-5 text-[#f59e0b]" />}
                <span className={`text-[20px] font-bold ${isPro ? 'text-white' : 'text-[#0f172a]'}`}>
                  {isPro ? 'Pro' : 'Free'} plan
                </span>
              </div>
              <p className={`text-[13px] ${isPro ? 'text-white/50' : 'text-[#64748b]'}`}>
                {isPro
                  ? subscription?.current_period_end
                    ? `Renews ${new Date(subscription.current_period_end).toLocaleDateString()}`
                    : 'Active subscription'
                  : `$0 / month · upgrade for $${PRO_PRICE_MONTHLY}/user`}
              </p>
            </div>
            {isPro ? (
              <button
                onClick={() => act(() => openBillingPortal(workspaceId!), 'portal')}
                disabled={busy === 'portal'}
                className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-white rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-60"
              >
                {busy === 'portal' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Manage billing
              </button>
            ) : (
              <button
                onClick={() => act(() => startCheckout(workspaceId!, 'monthly'), 'checkout')}
                disabled={busy === 'checkout'}
                className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-white rounded-xl disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}
              >
                {busy === 'checkout' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Upgrade to Pro
              </button>
            )}
          </div>
        </motion.div>

        {/* Usage */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 mb-6">
          <h2 className="text-[15px] font-bold text-[#0f172a] mb-4">Usage</h2>
          <div className="space-y-4">
            <UsageBar label="Boards" used={boards.length} limit={limits.boards} />
            <UsageBar label="Members" used={members.length} limit={limits.members} />
            <UsageBar label="Storage" used={storageUsed} limit={limits.storageBytes} format={fmtBytes} />
          </div>
        </div>

        {/* Plan comparison */}
        {!isPro && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PlanCard title="Free" price="$0" current perks={[`${PLAN_LIMITS.free.boards} boards`, `${PLAN_LIMITS.free.members} members`, '100 MB storage', '5 automations', 'Table, Kanban, Calendar']} />
            <PlanCard title="Pro" price={`$${PRO_PRICE_MONTHLY}`} highlight perks={['Unlimited boards', 'Unlimited members', '10 GB storage', 'Unlimited automations', 'All views + CSV export']} />
          </div>
        )}
      </div>
    </div>
  )
}

function UsageBar({ label, used, limit, format }: { label: string; used: number; limit: number; format?: (n: number) => string }) {
  const unlimited = limit === -1
  const pct = unlimited ? 0 : Math.min(100, (used / limit) * 100)
  const danger = !unlimited && pct >= 90
  const fmt = format ?? ((n: number) => String(n))
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-semibold text-[#0f172a]">{label}</span>
        <span className="text-[12px] text-[#64748b] font-medium">
          {fmt(used)} {unlimited ? '· unlimited' : `/ ${fmt(limit)}`}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[#f1f5f9] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: unlimited ? '8%' : `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ background: unlimited ? '#22c55e' : danger ? '#ef4444' : 'linear-gradient(90deg,#0ea5e9,#6366f1)' }}
        />
      </div>
    </div>
  )
}

function PlanCard({ title, price, perks, current, highlight }: { title: string; price: string; perks: string[]; current?: boolean; highlight?: boolean }) {
  return (
    <div className="rounded-2xl p-5 border" style={{ borderColor: highlight ? '#0ea5e9' : '#e2e8f0', background: '#fff' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[16px] font-bold text-[#0f172a]">{title}</span>
        {current && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f1f5f9] text-[#64748b] uppercase tracking-wider">Current</span>}
      </div>
      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-[26px] font-black text-[#0f172a]">{price}</span>
        <span className="text-[12px] text-[#94a3b8]">/ mo</span>
      </div>
      <div className="space-y-2">
        {perks.map((p) => (
          <div key={p} className="flex items-center gap-2 text-[13px] text-[#334155]">
            <Check className="w-3.5 h-3.5 text-[#22c55e]" /> {p}
          </div>
        ))}
      </div>
    </div>
  )
}
