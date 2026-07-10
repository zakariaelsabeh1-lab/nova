import { useNavigate } from 'react-router-dom'
import { motion, type Variants } from 'framer-motion'
import { LayoutGrid, ArrowUpRight, Users, Clock, AlertTriangle, CheckCircle2, Zap, Plus } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useCurrentWorkspace, useMembers } from '@/lib/db/workspaces'
import { useWorkspaceBoards, useFavorites } from '@/lib/db/boards'
import { useMyWork } from '@/lib/db/mywork'
import { CreateBoardModal } from '@/components/board/CreateBoardModal'
import { getInitials } from '@/lib/utils'

const stagger: Variants = { animate: { transition: { staggerChildren: 0.08 } } }
const fadeUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}
const avatarColors = ['#0ea5e9', '#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#ec4899']

export function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { workspace } = useCurrentWorkspace()
  const { data: boards = [], isLoading } = useWorkspaceBoards(workspace?.id ?? null)
  const { data: members = [] } = useMembers(workspace?.id ?? null)
  const { data: favorites } = useFavorites()
  const { data: buckets } = useMyWork(workspace?.id ?? null)
  const [showCreate, setShowCreate] = useState(false)

  const firstName = user?.full_name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const myOpen = buckets ? (['today', 'week', 'nextWeek', 'later', 'noDate'] as const).reduce((s, b) => s + (buckets[b]?.length ?? 0), 0) : 0
  const overdue = buckets?.overdue?.length ?? 0

  const stats = [
    { label: 'Boards', value: boards.length, icon: LayoutGrid, grad: 'linear-gradient(135deg,#0ea5e9,#0284c7)', glow: 'rgba(14,165,233,0.4)' },
    { label: 'Members', value: members.length, icon: Users, grad: 'linear-gradient(135deg,#6366f1,#4f46e5)', glow: 'rgba(99,102,241,0.4)' },
    { label: 'My open items', value: myOpen, icon: Clock, grad: 'linear-gradient(135deg,#f59e0b,#d97706)', glow: 'rgba(245,158,11,0.4)' },
    { label: 'Overdue', value: overdue, icon: AlertTriangle, grad: 'linear-gradient(135deg,#ef4444,#dc2626)', glow: 'rgba(239,68,68,0.4)' },
  ]

  return (
    <motion.div className="h-full overflow-y-auto" variants={stagger} initial="initial" animate="animate">
      {/* Hero */}
      <div className="relative overflow-hidden px-4 md:px-8 pt-6 md:pt-10 pb-10 md:pb-14" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #0f172a 100%)' }}>
        <motion.div className="absolute -top-20 -right-20 w-80 h-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)' }} animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 6, repeat: Infinity }} />
        <div className="relative max-w-[1200px] mx-auto">
          <motion.div variants={fadeUp} className="mb-6 md:mb-9">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-3.5 h-3.5 text-[#0ea5e9]" />
              <span className="text-[11px] font-semibold text-white/40 uppercase tracking-[0.12em]">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <h1 className="text-[24px] md:text-[32px] font-bold text-white tracking-tight leading-none mb-2">{greeting}, {firstName} 👋</h1>
            <p className="text-white/40 text-[14px] md:text-[15px]">{workspace?.name ?? 'Your workspace'} at a glance.</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {stats.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 24, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.1 + i * 0.08 }} whileHover={{ y: -4, scale: 1.02 }} className="relative rounded-2xl p-4 md:p-5 overflow-hidden" style={{ background: stat.grad, boxShadow: `0 8px 32px -4px ${stat.glow}` }}>
                <div className="flex items-start justify-between mb-3 md:mb-4">
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <stat.icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                </div>
                <div className="text-[28px] md:text-[34px] font-black text-white leading-none mb-0.5 tracking-tight tabular-nums">{stat.value}</div>
                <div className="text-[11px] md:text-[13px] font-medium text-white/70">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">
          <div>
            <motion.div variants={fadeUp} className="flex items-center justify-between mb-4 md:mb-5">
              <h2 className="text-[16px] font-bold text-[#0f172a]">Boards</h2>
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 text-[13px] font-semibold text-[#0ea5e9] hover:text-[#0284c7]">
                <Plus className="w-4 h-4" /> New board
              </button>
            </motion.div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((i) => <div key={i} className="bg-white border border-[#e2e8f0] rounded-2xl p-5 h-32 animate-pulse" />)}
              </div>
            ) : boards.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {boards.map((board, i) => (
                  <motion.div key={board.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06 }} whileHover={{ y: -4, boxShadow: `0 20px 48px -8px ${board.color}30` }} onClick={() => navigate(`/board/${board.id}`)} className="bg-white border border-[#e2e8f0] rounded-2xl p-5 cursor-pointer group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.05] group-hover:opacity-[0.09] transition-opacity" style={{ background: board.color, transform: 'translate(30%,-30%)' }} />
                    <div className="flex items-start justify-between mb-5 relative">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: board.color + '18' }}>
                        <div className="w-4 h-4 rounded" style={{ background: board.color }} />
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-[#cbd5e1] group-hover:text-[#0ea5e9] transition-all" />
                    </div>
                    <h3 className="text-[15px] font-bold text-[#0f172a] mb-1 relative">{board.name}</h3>
                    <p className="text-[12px] text-[#94a3b8] relative">{favorites?.has(board.id) ? '★ Favorite' : board.description || 'No description'}</p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-white border-2 border-dashed border-[#e2e8f0] rounded-2xl p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#f1f5f9] flex items-center justify-center mx-auto mb-3"><LayoutGrid className="w-6 h-6 text-[#cbd5e1]" /></div>
                <p className="text-[14px] font-semibold text-[#94a3b8] mb-3">No boards yet</p>
                <button onClick={() => setShowCreate(true)} className="px-4 py-2 text-[13px] font-semibold text-white rounded-xl" style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}>Create your first board</button>
              </div>
            )}
          </div>

          {/* Right rail */}
          <motion.div variants={fadeUp} className="space-y-4">
            <button onClick={() => navigate('/my-work')} className="w-full text-left rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                <span className="text-white/40 text-[10px] uppercase tracking-[0.15em] font-bold">My Work</span>
              </div>
              <div className="text-white text-[26px] font-black leading-none mb-1">{myOpen}</div>
              <div className="text-white/40 text-[12px]">open items{overdue > 0 && <span className="text-[#ef4444] font-semibold"> · {overdue} overdue</span>}</div>
            </button>

            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-bold text-[#0f172a]">Team</span>
                <span className="text-[12px] text-[#94a3b8]">{members.length}</span>
              </div>
              <div className="flex -space-x-2">
                {members.slice(0, 6).map((m, i) => (
                  <div key={m.id} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-[11px] font-bold" style={{ background: avatarColors[i % avatarColors.length] }} title={m.profile?.full_name}>
                    {getInitials(m.profile?.full_name || m.profile?.email || '?')}
                  </div>
                ))}
                {members.length > 6 && <div className="w-8 h-8 rounded-full border-2 border-white bg-[#94a3b8] flex items-center justify-center text-white text-[10px] font-bold">+{members.length - 6}</div>}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {showCreate && workspace && <CreateBoardModal workspaceId={workspace.id} onClose={() => setShowCreate(false)} />}
    </motion.div>
  )
}
