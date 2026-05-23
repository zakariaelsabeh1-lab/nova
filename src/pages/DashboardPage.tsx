import { motion, type Variants } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  CheckSquare,
  FolderKanban,
  ClipboardList,
  Palmtree,
  TrendingUp,
  Clock,
  Users,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Zap,
  Activity,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useBoards, useBoardStats, useProfiles } from '@/lib/queries'
import { DashboardSkeleton } from '@/components/ui/Skeleton'
import { getInitials } from '@/lib/utils'

const stagger: Variants = {
  animate: { transition: { staggerChildren: 0.08 } },
}

const fadeUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}

const boardMeta: Record<string, { icon: React.ElementType; color: string; bg: string; gradient: string }> = {
  tasks: {
    icon: CheckSquare,
    color: '#0ea5e9',
    bg: 'bg-sky-50',
    gradient: 'from-sky-500/10 to-sky-500/0',
  },
  projects: {
    icon: FolderKanban,
    color: '#8b5cf6',
    bg: 'bg-violet-50',
    gradient: 'from-violet-500/10 to-violet-500/0',
  },
  assignments: {
    icon: ClipboardList,
    color: '#f59e0b',
    bg: 'bg-amber-50',
    gradient: 'from-amber-500/10 to-amber-500/0',
  },
  vacation: {
    icon: Palmtree,
    color: '#22c55e',
    bg: 'bg-green-50',
    gradient: 'from-green-500/10 to-green-500/0',
  },
}

const avatarColors = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#22c55e', '#ef4444']

const recentActivity = [
  { user: 'Alex M.', action: 'completed', task: 'API integration setup', time: '2m ago', color: '#0ea5e9' },
  { user: 'Sarah K.', action: 'commented on', task: 'Dashboard redesign', time: '12m ago', color: '#8b5cf6' },
  { user: 'You', action: 'moved', task: 'Backend tests to Review', time: '1h ago', color: '#22c55e' },
  { user: 'Tom R.', action: 'assigned', task: 'Mobile app bug fix', time: '2h ago', color: '#f59e0b' },
  { user: 'Maya L.', action: 'created', task: 'User authentication flow', time: '3h ago', color: '#ef4444' },
]

export function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { data: boards, isLoading: boardsLoading } = useBoards()
  const { data: stats, isLoading: statsLoading } = useBoardStats()
  const { data: profiles } = useProfiles()

  const firstName = user?.full_name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (statsLoading && boardsLoading) {
    return <DashboardSkeleton />
  }

  const statCards = [
    {
      label: 'Open Tasks',
      value: String(stats?.open ?? '0'),
      icon: Circle,
      color: '#0ea5e9',
      gradient: 'from-sky-50 to-white',
      badge: 'Active',
      badgeColor: '#0ea5e9',
    },
    {
      label: 'Completed',
      value: String(stats?.done ?? '0'),
      icon: CheckCircle2,
      color: '#22c55e',
      gradient: 'from-green-50 to-white',
      badge: 'All time',
      badgeColor: '#22c55e',
    },
    {
      label: 'Team Members',
      value: String(profiles?.length ?? '0'),
      icon: Users,
      color: '#8b5cf6',
      gradient: 'from-violet-50 to-white',
      badge: 'Active',
      badgeColor: '#8b5cf6',
    },
    {
      label: 'Due This Week',
      value: String(stats?.dueThisWeek ?? '0'),
      icon: Clock,
      color: '#f59e0b',
      gradient: 'from-amber-50 to-white',
      badge: 'Upcoming',
      badgeColor: '#f59e0b',
    },
  ]

  return (
    <motion.div
      className="max-w-[1200px] mx-auto px-8 py-8"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
          <span className="text-[12px] text-[#64748b] font-medium uppercase tracking-widest">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </div>
        <h1 className="text-[30px] font-bold text-[#0f172a] tracking-tight leading-tight">
          {greeting}, {firstName}
        </h1>
        <p className="text-[#64748b] text-[15px] mt-1">
          Here's what's happening across your workspace today.
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-4 gap-4 mb-8">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -3, boxShadow: `0 12px 32px -4px ${stat.color}20` }}
            className={`bg-gradient-to-br ${stat.gradient} border border-[#e2e8f0] rounded-2xl p-5 transition-all cursor-default relative overflow-hidden group`}
          >
            <div
              className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-5 group-hover:opacity-10 transition-opacity"
              style={{ background: stat.color }}
            />
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: stat.color + '18' }}
              >
                <stat.icon style={{ color: stat.color, width: 20, height: 20 }} />
              </div>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: stat.badgeColor + '15', color: stat.badgeColor }}
              >
                {stat.badge}
              </span>
            </div>
            <div className="text-[32px] font-bold text-[#0f172a] leading-none mb-1">{stat.value}</div>
            <div className="text-[13px] text-[#64748b] font-medium">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Boards + Activity */}
      <div className="grid grid-cols-[1fr_300px] gap-6">
        {/* Boards */}
        <div>
          <motion.div variants={fadeUp} className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-[#0f172a]">Your Boards</h2>
            <span className="text-[12px] text-[#94a3b8]">{boards?.length ?? 0} boards</span>
          </motion.div>

          {boardsLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-[#e2e8f0] rounded-2xl p-5 animate-pulse">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-10 h-10 bg-[#e2e8f0] rounded-xl" />
                    <div className="w-4 h-4 bg-[#e2e8f0] rounded" />
                  </div>
                  <div className="h-4 bg-[#e2e8f0] rounded w-2/3 mb-2" />
                  <div className="h-3 bg-[#f1f5f9] rounded w-full mb-4" />
                  <div className="h-1.5 bg-[#f1f5f9] rounded-full" />
                </div>
              ))}
            </div>
          ) : boards && boards.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {boards.map((board, i) => {
                const meta = boardMeta[board.type] || boardMeta.tasks
                return (
                  <motion.div
                    key={board.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.07 }}
                    whileHover={{ y: -4, boxShadow: `0 16px 40px -8px ${meta.color}25` }}
                    onClick={() => navigate(`/board/${board.id}`)}
                    className="bg-white border border-[#e2e8f0] rounded-2xl p-5 cursor-pointer transition-all group relative overflow-hidden"
                  >
                    <div
                      className={`absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.04] group-hover:opacity-[0.07] transition-opacity`}
                      style={{ background: meta.color, transform: 'translate(30%, -30%)' }}
                    />
                    <div className="flex items-start justify-between mb-5 relative">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center ${meta.bg} border border-[${meta.color}]/20`}
                      >
                        <meta.icon style={{ color: meta.color, width: 22, height: 22 }} />
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-[#cbd5e1] group-hover:text-[#0ea5e9] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>
                    <h3 className="text-[15px] font-semibold text-[#0f172a] mb-1 relative">{board.name}</h3>
                    <p className="text-[12px] text-[#94a3b8] mb-4 relative">{board.description || 'No description'}</p>
                    <div className="h-1 bg-[#f1f5f9] rounded-full overflow-hidden relative">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: meta.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${30 + i * 15}%` }}
                        transition={{ duration: 1, delay: 0.4 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-[#e2e8f0] rounded-2xl p-10 text-center">
              <Zap className="w-8 h-8 text-[#cbd5e1] mx-auto mb-3" />
              <p className="text-[14px] font-medium text-[#94a3b8] mb-1">No boards yet</p>
              <p className="text-[12px] text-[#cbd5e1]">Run the seed SQL to create default boards</p>
            </div>
          )}
        </div>

        {/* Right column */}
        <motion.div variants={fadeUp} className="space-y-4">
          {/* Activity */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-semibold text-[#0f172a]">Activity</h2>
              <Activity className="w-4 h-4 text-[#94a3b8]" />
            </div>
            <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-sm">
              {recentActivity.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.07 }}
                  className="px-4 py-3 border-b border-[#f8fafc] last:border-0 hover:bg-[#f8fafc] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mt-0.5"
                      style={{ background: item.color }}
                    >
                      {item.user[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-[#0f172a] leading-snug">
                        <span className="font-semibold">{item.user}</span>{' '}
                        <span className="text-[#64748b]">{item.action}</span>{' '}
                        <span className="font-medium text-[#0f172a]">{item.task}</span>
                      </p>
                      <span className="text-[11px] text-[#94a3b8] mt-0.5 block">{item.time}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Date / Team card */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="bg-[#0f172a] rounded-2xl p-5 relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-[#0ea5e9]" style={{ transform: 'translate(30%, -30%)' }} />
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-[#8b5cf6]" style={{ transform: 'translate(-30%, 30%)' }} />
            </div>
            <div className="relative">
              <div className="text-white/40 text-[10px] uppercase tracking-widest mb-1 font-semibold">Today</div>
              <div className="text-white text-[22px] font-bold leading-none mb-0.5">
                {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
              </div>
              <div className="text-white/40 text-[13px]">
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>

              {profiles && profiles.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-white/40 text-[11px] font-medium">Team</div>
                    <div className="text-white/30 text-[11px]">{profiles.length} members</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      {profiles.slice(0, 5).map((p, i) => (
                        <div
                          key={p.id}
                          className="w-7 h-7 rounded-full border-2 border-[#0f172a] flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ background: avatarColors[i % avatarColors.length], zIndex: 5 - i }}
                          title={p.full_name}
                        >
                          {getInitials(p.full_name || p.email)}
                        </div>
                      ))}
                      {profiles.length > 5 && (
                        <div className="w-7 h-7 rounded-full border-2 border-[#0f172a] bg-white/15 flex items-center justify-center text-white text-[10px] font-bold">
                          +{profiles.length - 5}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                      <span className="text-white/40 text-[11px]">Online</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-[#22c55e]" />
                  <span className="text-white/60 text-[12px]">
                    <span className="text-[#22c55e] font-semibold">{stats?.done ?? 0}</span> tasks completed this week
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}
