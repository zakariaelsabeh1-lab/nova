import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  compact?: boolean
}

export function EmptyState({ icon: Icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-16 px-8'}`}
    >
      <div className={`${compact ? 'w-10 h-10' : 'w-14 h-14'} rounded-2xl bg-[#f1f5f9] flex items-center justify-center mb-3`}>
        <Icon className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} text-[#94a3b8]`} />
      </div>
      <p className={`${compact ? 'text-[13px]' : 'text-[15px]'} font-semibold text-[#0f172a] mb-1`}>{title}</p>
      {description && (
        <p className={`${compact ? 'text-[11px]' : 'text-[13px]'} text-[#94a3b8] max-w-[220px]`}>{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 text-[13px] font-medium text-white bg-[#0f172a] rounded-xl hover:bg-[#1e293b] transition-colors"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  )
}
