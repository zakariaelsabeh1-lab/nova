import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Sparkles, Loader2, X } from 'lucide-react'
import type { GatedFeature } from '@/lib/plan'
import { FEATURE_COPY, PRO_PRICE_MONTHLY } from '@/lib/plan'
import { startCheckout } from '@/lib/billing'
import { errorMessage, notifyError } from '@/lib/toast'

const PRO_PERKS = [
  'Unlimited boards & members',
  'Timeline / Gantt & Dashboards',
  '10 GB file storage',
  'Unlimited automations',
  'CSV export',
  'Priority badge',
]

// Inline paywall panel shown where a gated feature would render.
export function Paywall({
  feature,
  workspaceId,
  variant = 'panel',
}: {
  feature: GatedFeature
  workspaceId: string | null
  variant?: 'panel' | 'modal'
  onClose?: () => void
}) {
  const [loading, setLoading] = useState(false)
  const copy = FEATURE_COPY[feature]

  const upgrade = async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      await startCheckout(workspaceId, 'monthly')
    } catch (e) {
      notifyError(errorMessage(e, 'Could not start checkout'))
      setLoading(false)
    }
  }

  return (
    <div className={variant === 'panel' ? 'flex items-center justify-center h-full p-6' : ''}>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-[440px] rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}
      >
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full" style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.18) 0%, transparent 70%)' }} />
        <div className="relative p-7">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-[#0ea5e9] mb-4" style={{ background: 'rgba(14,165,233,0.14)' }}>
            <Sparkles className="w-3.5 h-3.5" /> PRO FEATURE
          </div>
          <h2 className="text-white text-[22px] font-bold tracking-tight mb-1.5">{copy.title}</h2>
          <p className="text-white/50 text-[14px] mb-6 leading-relaxed">{copy.blurb}</p>

          <div className="space-y-2.5 mb-6">
            {PRO_PERKS.map((perk) => (
              <div key={perk} className="flex items-center gap-2.5 text-[13.5px] text-white/80">
                <div className="w-4 h-4 rounded-full bg-[#22c55e]/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-2.5 h-2.5 text-[#22c55e]" strokeWidth={3} />
                </div>
                {perk}
              </div>
            ))}
          </div>

          <div className="flex items-baseline gap-1.5 mb-5">
            <span className="text-white text-[30px] font-black tracking-tight">${PRO_PRICE_MONTHLY}</span>
            <span className="text-white/40 text-[13px]">/ user / month</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={upgrade}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 text-[14px] font-semibold text-white rounded-xl disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', boxShadow: '0 8px 24px rgba(14,165,233,0.35)' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upgrade to Pro'}
          </motion.button>
          <p className="text-center text-white/30 text-[11px] mt-3">Secure checkout via Stripe · cancel anytime</p>
        </div>
      </motion.div>
    </div>
  )
}

// Modal wrapper (used when a locked tab/button is clicked).
export function PaywallModal({
  feature,
  workspaceId,
  onClose,
}: {
  feature: GatedFeature
  workspaceId: string | null
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative">
        <button onClick={onClose} className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center text-[#64748b] hover:text-[#0f172a]">
          <X className="w-4 h-4" />
        </button>
        <Paywall feature={feature} workspaceId={workspaceId} variant="modal" />
      </div>
    </div>
  )
}
