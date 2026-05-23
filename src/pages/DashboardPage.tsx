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
  ArrowRight,
  Circle,
  CheckCircle2,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const stagger: Variants = {
  animate: { transition: { staggerChildren: 0.07 } },
}

const fadeUp: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

const boards = [
  {
    id: 'tasks',
    name: 'Tasks',
    icon: CheckSquare,
    color: '#0ea5e9',
    bg: 'bg-sky-50',
    border: 'border-sky-100',
    count: 24,
    done: 18,
    desc: 'Daily operational tasks',
  },
  {
    id: 'projects',
    name: 'Projects',
    icon: FolderKanban,
    color: '#8b5cf6',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    count: 8,
    done: 3,
    desc: 'Active project pipelines',
  },
  {
    id: 'assignments',
    name: 'Assignments',
    icon: ClipboardList,
    color: '#f59e0b',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    count: 15,
    done: 10,
    desc: 'Team assignments & reviews',
  },
  {
    id: 'vacation',
    name: 'Vacation',
    icon: Palmtree,
    color: '#22c55e',
    bg: 'bg-green-50',
    border: 'border-green-100',
    count: 5,
    done: 2,
    desc: 'Time-off & leave requests',
  },
]

const stats = [
  { label: 'Open Tasks', value: '14', icon: Circle, color: '#0ea5e9', change: '+2 today' },
  { label: 'Completed', value: '33', icon: CheckCircle2, color: '#22c55e', change: '+5 this week' },
  { label: 'Team Members', value: '8', icon: Users, color: '#8b5cf6', change: 'Active' },
  { label: 'Due This Week', value: '6', icon: Clock, color: '#f59e0b', change: '2 overdue' },
]

const recentActivity = [
  { user: 'Alex M.', action: 'completed', task: 'API integration setup', time: '2m ago', color: '#0ea5e9' },
  { user: 'Sarah K.', action: 'commented on', task: 'Dashboard redesign', time: '12m ago', color: '#8b5cf6' },
  { user: 'You', action: 'moved', task: 'Backend tests to Review', time: '1h ago', color: '#22c55e' },
  { user: 'Tom R.', action: 'assigned', task: 'Mobile app bug fix', time: '2h ago', color: '#f59e0b' },
]

export function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const firstName = user?.full_name?.split(' ')[0] || 'there'

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <motion.div
      className="max-w-[1200px] mx-auto px-8 py-8"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="mb-8">
        <h1 className="text-[28px] font-bold text-[#0f172a] tracking-tight mb-1">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-[#64748b] text-[15px]">
          Here's what's happening across your workspace today.
        </p>
      </motion.div>

      {/* Stats row */}
      <motion.div variants={fadeUp} className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ y: -2, boxShadow: '0 8px 24px -4px rgba(0,0,0,0.08)' }}
            className="bg-white border border-[#e2e8f0] rounded-2xl p-5 transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: stat.color + '15' }}
              >
                <stat.icon className="w-4.5 h-4.5" style={{ color: stat.color, width: 18, height: 18 }} />
              </div>
              <span className="text-[11px] text-[#94a3b8] font-medium">{stat.change}</span>
            </div>
            <div className="text-3xl font-bold text-[#0f172a] mb-0.5">{stat.value}</div>
            <div className="text-[13px] text-[#64748b]">{stat.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Boards grid + Activity */}
      <div className="grid grid-cols-[1fr_320px] gap-6">
        {/* Boards */}
        <div>
          <motion.div variants={fadeUp} className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-[#0f172a]">Your Boards</h2>
            <span className="text-[13px] text-[#0ea5e9] font-medium cursor-pointer hover:text-[#0284c7]">
              View all
            </span>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            {boards.map((board, i) => (
              <motion.div
                key={board.id}
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -3, boxShadow: '0 12px 32px -6px rgba(0,0,0,0.1)' }}
                onClick={() => navigate(`/board/${board.id}`)}
                className="bg-white border border-[#e2e8f0] rounded-2xl p-5 cursor-pointer transition-shadow group"
              >
                <div className="flex items-start justify-between mb-5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${board.bg} ${board.border} border`}
                  >
                    <board.icon style={{ color: board.color, width: 20, height: 20 }} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#cbd5e1] group-hover:text-[#94a3b8] transition-colors" />
                </div>

                <h3 className="text-[15px] font-semibold text-[#0f172a] mb-1">{board.name}</h3>
                <p className="text-[12px] text-[#94a3b8] mb-4">{board.desc}</p>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="text-[#64748b]">
                      {board.done}/{board.count} tasks
                    </span>
                    <span className="font-medium" style={{ color: board.color }}>
                      {Math.round((board.done / board.count) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: board.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(board.done / board.count) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold text-[#0f172a]">Recent Activity</h2>
            <TrendingUp className="w-4 h-4 text-[#94a3b8]" />
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden">
            <div className="divide-y divide-[#f1f5f9]">
              {recentActivity.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="px-4 py-3.5 hover:bg-[#f8fafc] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0 mt-0.5"
                      style={{ background: item.color }}
                    >
                      {item.user[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#0f172a] leading-snug">
                        <span className="font-medium">{item.user}</span>{' '}
                        <span className="text-[#64748b]">{item.action}</span>{' '}
                        <span className="font-medium">{item.task}</span>
                      </p>
                      <span className="text-[11px] text-[#94a3b8] mt-0.5 block">{item.time}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-[#f1f5f9]">
              <button className="text-[12px] text-[#0ea5e9] font-medium hover:text-[#0284c7] transition-colors">
                View all activity →
              </button>
            </div>
          </div>

          {/* Mini calendar / date widget */}
          <div className="bg-[#0f172a] rounded-2xl p-5 mt-4">
            <div className="text-white/40 text-[11px] uppercase tracking-widest mb-1">Today</div>
            <div className="text-white text-2xl font-bold">
              {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
            </div>
            <div className="text-white/40 text-[13px]">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="text-white/60 text-[12px] mb-2">Upcoming deadlines</div>
              <div className="space-y-2">
                {[
                  { label: 'API review', tag: 'Projects', color: '#8b5cf6' },
                  { label: 'Sprint planning', tag: 'Tasks', color: '#0ea5e9' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <span className="text-white/70 text-[12px] flex-1">{item.label}</span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: item.color + '25', color: item.color }}
                    >
                      {item.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
