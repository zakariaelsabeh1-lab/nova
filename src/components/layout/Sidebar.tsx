import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  ClipboardList,
  Palmtree,
  Users,
  Settings,
  LogOut,
  Bell,
  Loader2,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useBoards, useEnsureDefaultBoards } from '@/lib/queries'
import { getInitials, cn } from '@/lib/utils'
import type { ElementType } from 'react'

const boardIconMap: Record<string, ElementType> = {
  tasks: CheckSquare,
  projects: FolderKanban,
  assignments: ClipboardList,
  vacation: Palmtree,
}

const boardColorMap: Record<string, string> = {
  tasks: '#0ea5e9',
  projects: '#8b5cf6',
  assignments: '#f59e0b',
  vacation: '#22c55e',
}

export function Sidebar() {
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()
  const { data: boards = [], isLoading: boardsLoading } = useBoards()
  useEnsureDefaultBoards(user?.id)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const boardLinks = boards.map((board) => ({
    to: `/board/${board.id}`,
    label: board.name,
    icon: boardIconMap[board.type] || CheckSquare,
    color: boardColorMap[board.type] || board.color || '#0ea5e9',
  }))

  return (
    <motion.aside
      className="w-[240px] flex-shrink-0 flex flex-col h-full bg-[#080e1a] relative"
      initial={{ x: -240, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-[#0ea5e9]/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-[#6366f1]/5 blur-3xl" />
      </div>

      {/* Logo */}
      <div className="relative px-5 pt-5 pb-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0ea5e9] to-[#6366f1]" />
            <span className="relative text-white font-black text-[13px] z-10">N</span>
          </div>
          <div>
            <span className="text-white font-bold text-[15px] tracking-tight">Nova</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              <span className="text-[9px] font-semibold text-white/25 uppercase tracking-[0.1em]">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 px-3 py-4 overflow-y-auto">
        {/* Dashboard */}
        <SidebarLink to="/" label="Dashboard" icon={LayoutDashboard} end />

        {/* Boards */}
        <div className="mt-5 mb-1.5 px-3">
          <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.15em]">Boards</span>
        </div>

        {boardsLoading ? (
          <div className="flex items-center gap-3 px-3 py-2.5">
            <Loader2 className="w-4 h-4 text-white/20 animate-spin" />
            <span className="text-[13px] text-white/20">Loading...</span>
          </div>
        ) : (
          <div className="space-y-0.5">
            {boardLinks.map((link, i) => (
              <motion.div
                key={link.to}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.06 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              >
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group overflow-hidden',
                      isActive
                        ? 'text-white'
                        : 'text-white/40 hover:text-white/75 hover:bg-white/[0.04]'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="board-active"
                          className="absolute inset-0 rounded-xl"
                          style={{
                            background: `linear-gradient(135deg, ${link.color}22, ${link.color}08)`,
                          }}
                          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                        />
                      )}
                      {isActive && (
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                          style={{ background: link.color }}
                        />
                      )}
                      <div
                        className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 relative z-10 transition-all',
                          isActive ? 'shadow-md' : 'bg-white/[0.04] group-hover:bg-white/[0.07]'
                        )}
                        style={isActive ? { background: link.color + '22' } : {}}
                      >
                        <link.icon className="w-3.5 h-3.5" style={{ color: isActive ? link.color : undefined }} />
                      </div>
                      <span className="relative z-10 flex-1">{link.label}</span>
                      {isActive && (
                        <div
                          className="w-1.5 h-1.5 rounded-full relative z-10"
                          style={{ background: link.color, boxShadow: `0 0 6px ${link.color}` }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              </motion.div>
            ))}
          </div>
        )}

        {/* Workspace */}
        <div className="mt-5 mb-1.5 px-3">
          <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.15em]">Workspace</span>
        </div>

        <div className="space-y-0.5">
          <SidebarLink to="/team" label="Team" icon={Users} />
          <SidebarLink to="/settings" label="Settings" icon={Settings} />
        </div>
      </nav>

      {/* Notifications */}
      <div className="relative px-3 pb-2">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-all group">
          <div className="relative">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#ef4444] rounded-full border border-[#080e1a] flex items-center justify-center text-[8px] font-black text-white">3</span>
          </div>
          <span className="text-[13px] font-medium">Notifications</span>
        </button>
      </div>

      {/* User */}
      <div className="relative px-3 pb-4 pt-2 border-t border-white/[0.05]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer group">
          <div className="relative w-7 h-7 flex-shrink-0">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] flex items-center justify-center text-white text-[11px] font-bold">
              {user ? getInitials(user.full_name || user.email) : '?'}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#22c55e] rounded-full border-2 border-[#080e1a]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/85 text-[12px] font-semibold truncate leading-tight">
              {user?.full_name || user?.email || 'User'}
            </p>
            <p className="text-white/25 text-[10px] truncate capitalize font-medium">{user?.role}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-red-400 transition-all p-1 rounded-lg hover:bg-white/[0.05]"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.aside>
  )
}

function SidebarLink({
  to,
  label,
  icon: Icon,
  end = false,
}: {
  to: string
  label: string
  icon: ElementType
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group',
          isActive
            ? 'text-white bg-white/[0.07]'
            : 'text-white/40 hover:text-white/75 hover:bg-white/[0.04]'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId={`sidebar-active-${to}`}
              className="absolute inset-0 bg-white/[0.07] rounded-xl"
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            />
          )}
          <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0 relative z-10 group-hover:bg-white/[0.07] transition-colors">
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="relative z-10">{label}</span>
        </>
      )}
    </NavLink>
  )
}
