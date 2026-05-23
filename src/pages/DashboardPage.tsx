import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring, type Variants } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  CheckSquare, FolderKanban, ClipboardList, Palmtree,
  ArrowUpRight, CheckCircle2, Circle, Users, Clock,
  Activity, TrendingUp, Zap,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useBoards, useBoardStats, useProfiles } from '@/lib/queries'
import { getInitials } from '@/lib/utils'

const stagger: Variants = {
  animate: { transition: { staggerChildren: 0.09 } },
}
const fadeUp: Variants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

const boardMeta: Record<string, { icon: typeof CheckSquare; color: string; bg: string }> = {
  tasks:       { icon: CheckSquare,   color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
  projects:    { icon: FolderKanban,  color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  assignments: { icon: ClipboardList, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  vacation:    { icon: Palmtree,      color: '#22c55e', bg: 'rgba(34,197,94,0.1)'  },
}

const avatarColors = ['#0ea5e9', '#6366f1', '#f59e0b', '#22c55e', '#ef4444']

const recentActivity = [
  { user: 'Alex M.',  action: 'completed', task: 'API integration setup', time: '2m ago',  color: '#0ea5e9' },
  { user: 'Sarah K.', action: 'commented', task: 'Dashboard redesign',    time: '14m ago', color: '#8b5cf6' },
  { user: 'You',      action: 'moved',     task: 'Backend tests → Review', time: '1h ago', color: '#22c55e' },
  { user: 'Tom R.',   action: 'assigned',  task: 'Mobile app bug fix',    time: '2h ago',  color: '#f59e0b' },
  { user: 'Maya L.',  action: 'created',   task: 'Auth flow redesign',    time: '3h ago',  color: '#ef4444' },
]

function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 80, damping: 15 })
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => { mv.set(value) }, [value, mv])
  useEffect(() => spring.on('change', (v) => { if (ref.current) ref.current.textContent = Math.round(v).toString() }), [spring])

  return <span ref={ref}>0</span>
}

export function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { data: boards, isLoading: boardsLoading } = useBoards()
  const { data: stats } = useBoardStats()
  const { data: profiles } = useProfiles()

  const firstName = user?.full_name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const statCards = [
    {
      label: 'Open Tasks',
      value: stats?.open ?? 0,
      icon: Circle,
      grad: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
      glow: 'rgba(14,165,233,0.4)',
      badge: 'Active',
    },
    {
      label: 'Completed',
      value: stats?.done ?? 0,
      icon: CheckCircle2,
      grad: 'linear-gradient(135deg, #22c55e, #16a34a)',
      glow: 'rgba(34,197,94,0.4)',
      badge: 'All time',
    },
    {
      label: 'Team Members',
      value: profiles?.length ?? 0,
      icon: Users,
      grad: 'linear-gradient(135deg, #6366f1, #4f46e5)',
      glow: 'rgba(99,102,241,0.4)',
      badge: 'Online',
    },
    {
      label: 'Due This Week',
      value: stats?.dueThisWeek ?? 0,
      icon: Clock,
      grad: 'linear-gradient(135deg, #f59e0b, #d97706)',
      glow: 'rgba(245,158,11,0.4)',
      badge: 'Upcoming',
    },
  ]

  return (
    <motion.div
      className="h-full overflow-y-auto"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* ── Landing banner ───────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="px-8 py-5 border-b border-[#e2e8f0] bg-white flex items-center gap-4"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h1 className="text-[22px] font-black text-[#0f172a] tracking-tight leading-none">Welcome to Nova</h1>
          <span
            className="text-[11px] font-black px-2.5 py-1 rounded-full tracking-widest uppercase flex-shrink-0"
            style={{ background: 'rgba(14,165,233,0.12)', color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.25)' }}
          >
            DEMO
          </span>
        </div>
        <p className="text-[13px] text-[#64748b] hidden md:block flex-shrink-0">
          Manage your team's tasks, projects, assignments and vacation requests — all in one place.
        </p>
      </motion.div>

      {/* ── Hero gradient section ─────────────────────────── */}
      <div
        className="relative overflow-hidden px-8 pt-10 pb-14"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #0f172a 100%)' }}
      >
        {/* Animated blobs */}
        <motion.div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-10 left-20 w-64 h-64 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative max-w-[1200px] mx-auto">
          <motion.div variants={fadeUp} className="mb-9">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-3.5 h-3.5 text-[#0ea5e9]" />
              <span className="text-[11px] font-semibold text-white/40 uppercase tracking-[0.12em]">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <h1 className="text-[32px] font-bold text-white tracking-tight leading-none mb-2">
              {greeting}, {firstName} 👋
            </h1>
            <p className="text-white/40 text-[15px]">Here's your workspace at a glance.</p>
          </motion.div>

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4">
            {statCards.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="relative rounded-2xl p-5 overflow-hidden cursor-default"
                style={{ background: stat.grad, boxShadow: `0 8px 32px -4px ${stat.glow}` }}
              >
                <div className="absolute inset-0 opacity-10"
                  style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 60%)' }}
                />
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                      <stat.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-white/70 bg-white/15 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {stat.badge}
                    </span>
                  </div>
                  <div className="text-[34px] font-black text-white leading-none mb-0.5 tracking-tight">
                    <AnimatedNumber value={stat.value} />
                  </div>
                  <div className="text-[13px] font-medium text-white/70">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content section ──────────────────────────────── */}
      <div className="max-w-[1200px] mx-auto px-8 py-8">
        <div className="grid grid-cols-[1fr_300px] gap-6">
          {/* Boards */}
          <div>
            <motion.div variants={fadeUp} className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-bold text-[#0f172a]">Your Boards</h2>
              <span className="text-[12px] text-[#94a3b8] font-medium">{boards?.length ?? 0} boards</span>
            </motion.div>

            {boardsLoading ? (
              <div className="grid grid-cols-2 gap-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="bg-white border border-[#e2e8f0] rounded-2xl p-5 animate-pulse">
                    <div className="flex items-start justify-between mb-5">
                      <div className="w-11 h-11 bg-[#f1f5f9] rounded-xl" />
                      <div className="w-4 h-4 bg-[#f1f5f9] rounded" />
                    </div>
                    <div className="h-4 bg-[#f1f5f9] rounded w-2/3 mb-2" />
                    <div className="h-3 bg-[#f8fafc] rounded w-full mb-5" />
                    <div className="h-1 bg-[#f1f5f9] rounded-full" />
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
                      transition={{ delay: 0.2 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{ y: -4, boxShadow: `0 20px 48px -8px ${meta.color}30` }}
                      onClick={() => navigate(`/board/${board.id}`)}
                      className="bg-white border border-[#e2e8f0] rounded-2xl p-5 cursor-pointer transition-all group relative overflow-hidden"
                    >
                      <div
                        className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.05] group-hover:opacity-[0.09] transition-opacity"
                        style={{ background: meta.color, transform: 'translate(30%, -30%)' }}
                      />
                      <div className="flex items-start justify-between mb-5 relative">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center"
                          style={{ background: meta.bg }}
                        >
                          <meta.icon style={{ color: meta.color, width: 22, height: 22 }} />
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-[#cbd5e1] group-hover:text-[#0ea5e9] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                      </div>
                      <h3 className="text-[15px] font-bold text-[#0f172a] mb-1 relative">{board.name}</h3>
                      <p className="text-[12px] text-[#94a3b8] mb-4 relative leading-relaxed">
                        {board.description || 'No description'}
                      </p>
                      <div className="h-1 bg-[#f1f5f9] rounded-full overflow-hidden relative">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: meta.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${25 + i * 18}%` }}
                          transition={{ duration: 1.1, delay: 0.5 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white border-2 border-dashed border-[#e2e8f0] rounded-2xl p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#f1f5f9] flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-[#cbd5e1]" />
                </div>
                <p className="text-[14px] font-semibold text-[#94a3b8] mb-1">No boards yet</p>
                <p className="text-[12px] text-[#cbd5e1]">Run seed.sql to create default boards</p>
              </div>
            )}
          </div>

          {/* Right column */}
          <motion.div variants={fadeUp} className="space-y-4">
            {/* Activity */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-bold text-[#0f172a]">Activity</h2>
                <Activity className="w-4 h-4 text-[#94a3b8]" />
              </div>
              <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-sm">
                {recentActivity.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.07 }}
                    className="px-4 py-3 border-b border-[#f8fafc] last:border-0 hover:bg-[#fafafa] transition-colors"
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
                          <span className="font-semibold">{item.task}</span>
                        </p>
                        <span className="text-[11px] text-[#94a3b8] mt-0.5 block font-medium">{item.time}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Date + team card */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}
            >
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-[#0ea5e9]" style={{ transform: 'translate(40%, -40%)' }} />
                <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full bg-[#6366f1]" style={{ transform: 'translate(-30%, 30%)' }} />
              </div>
              <div className="relative">
                <div className="text-white/30 text-[9px] uppercase tracking-[0.15em] font-bold mb-1">Today</div>
                <div className="text-white text-[22px] font-bold leading-none mb-0.5 tracking-tight">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                </div>
                <div className="text-white/35 text-[12px] font-medium">
                  {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>

                {profiles && profiles.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/[0.08]">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-white/30 text-[10px] font-semibold uppercase tracking-widest">Team</span>
                      <span className="text-white/25 text-[11px]">{profiles.length} members</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {profiles.slice(0, 5).map((p, i) => (
                          <div
                            key={p.id}
                            className="w-8 h-8 rounded-full border-2 border-[#0f172a] flex items-center justify-center text-white text-[11px] font-bold"
                            style={{ background: avatarColors[i % avatarColors.length], zIndex: 5 - i }}
                            title={p.full_name}
                          >
                            {getInitials(p.full_name || p.email)}
                          </div>
                        ))}
                        {profiles.length > 5 && (
                          <div className="w-8 h-8 rounded-full border-2 border-[#0f172a] bg-white/15 flex items-center justify-center text-white text-[10px] font-bold" style={{ zIndex: 0 }}>
                            +{profiles.length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-[#22c55e]" />
                  <span className="text-white/40 text-[11px] font-medium">
                    <span className="text-[#22c55e] font-bold">{stats?.done ?? 0}</span> tasks done this week
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
