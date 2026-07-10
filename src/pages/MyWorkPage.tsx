import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CircleCheck, Loader2 } from 'lucide-react'
import { useCurrentWorkspaceId } from '@/lib/db/workspaces'
import { useMyWork, BUCKET_ORDER, BUCKET_LABEL, type Bucket } from '@/lib/db/mywork'
import { useAuthStore } from '@/store/authStore'

const BUCKET_COLOR: Record<Bucket, string> = {
  overdue: '#ef4444',
  today: '#0ea5e9',
  week: '#8b5cf6',
  nextWeek: '#f59e0b',
  later: '#64748b',
  noDate: '#94a3b8',
}

export function MyWorkPage() {
  const workspaceId = useCurrentWorkspaceId()
  const { data: buckets, isLoading } = useMyWork(workspaceId)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const firstName = user?.full_name?.split(' ')[0] || 'there'

  const total = buckets ? BUCKET_ORDER.reduce((s, b) => s + (buckets[b]?.length ?? 0), 0) : 0

  return (
    <div className="h-full overflow-y-auto bg-[#f1f5f9]">
      <div className="max-w-[820px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-[24px] font-bold text-[#0f172a] tracking-tight">My Work</h1>
          <p className="text-[14px] text-[#64748b] mt-1">
            {isLoading ? 'Loading your items…' : `${firstName}, you have ${total} item${total === 1 ? '' : 's'} assigned across all boards.`}
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#cbd5e1]" /></div>
        ) : total === 0 ? (
          <div className="bg-white border border-[#e2e8f0] rounded-2xl py-16 text-center">
            <CircleCheck className="w-10 h-10 mx-auto mb-3 text-[#22c55e]" />
            <p className="text-[15px] font-semibold text-[#0f172a]">You're all caught up</p>
            <p className="text-[13px] text-[#94a3b8] mt-1">Items assigned to you via a Person column will show up here.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {BUCKET_ORDER.map((bucket) => {
              const rows = buckets?.[bucket] ?? []
              if (!rows.length) return null
              return (
                <div key={bucket}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: BUCKET_COLOR[bucket] }} />
                    <h2 className="text-[14px] font-bold text-[#0f172a]">{BUCKET_LABEL[bucket]}</h2>
                    <span className="text-[12px] font-semibold text-[#94a3b8]">{rows.length}</span>
                  </div>
                  <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden">
                    {rows.map((it, i) => (
                      <motion.button
                        key={it.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => navigate(`/board/${it.board_id}`)}
                        className="w-full flex items-center gap-3 px-4 py-3 border-b border-[#f1f5f9] last:border-0 hover:bg-[#fafcff] text-left"
                      >
                        <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: it.board_color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[#0f172a] truncate">{it.name || 'Untitled'}</p>
                          <p className="text-[11px] text-[#94a3b8]">{it.board_name}</p>
                        </div>
                        {it.status && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full text-white flex-shrink-0" style={{ background: it.status_color ?? '#94a3b8' }}>
                            {it.status}
                          </span>
                        )}
                        {it.due && (
                          <span className="text-[11px] font-medium flex-shrink-0" style={{ color: bucket === 'overdue' ? '#ef4444' : '#64748b' }}>
                            {new Date(it.due + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
