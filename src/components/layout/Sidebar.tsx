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
  ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { getInitials, cn } from '@/lib/utils'

const boardLinks = [
  { to: '/board/tasks', label: 'Tasks', icon: CheckSquare, color: '#0ea5e9' },
  { to: '/board/projects', label: 'Projects', icon: FolderKanban, color: '#8b5cf6' },
  { to: '/board/assignments', label: 'Assignments', icon: ClipboardList, color: '#f59e0b' },
  { to: '/board/vacation', label: 'Vacation', icon: Palmtree, color: '#22c55e' },
]

export function Sidebar() {
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <motion.aside
      className="w-[240px] flex-shrink-0 flex flex-col h-full bg-[#0a0f1e] border-r border-white/[0.06] select-none"
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ x: 1 }}
          transition={{ duration: 0.15 }}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] flex items-center justify-center shadow-lg shadow-[#0ea5e9]/25 relative">
            <span className="text-white font-black text-[13px] tracking-tight">N</span>
            <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
          </div>
          <div>
            <span className="text-white font-bold text-[15px] tracking-tight">Nova</span>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              <span className="text-[10px] text-white/30 font-medium">Workspace</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        <SidebarLink to="/" label="Dashboard" icon={LayoutDashboard} end />

        <div className="px-3 pt-5 pb-2">
          <span className="text-[9px] font-bold text-white/25 uppercase tracking-[0.12em]">Boards</span>
        </div>

        {boardLinks.map((link, i) => (
          <motion.div
            key={link.to}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 + i * 0.05 }}
          >
            <SidebarLink
              to={link.to}
              label={link.label}
              icon={link.icon}
              accentColor={link.color}
            />
          </motion.div>
        ))}

        <div className="px-3 pt-5 pb-2">
          <span className="text-[9px] font-bold text-white/25 uppercase tracking-[0.12em]">Workspace</span>
        </div>

        <SidebarLink to="/team" label="Team" icon={Users} />
        <SidebarLink to="/settings" label="Settings" icon={Settings} />
      </nav>

      {/* Notification bell */}
      <div className="px-3 pb-2">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/35 hover:text-white/70 hover:bg-white/[0.05] transition-all group">
          <div className="relative">
            <Bell className="w-4 h-4" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#ef4444] rounded-full border border-[#0a0f1e] flex items-center justify-center">
              <span className="text-[8px] text-white font-bold">3</span>
            </div>
          </div>
          <span className="text-[13px]">Notifications</span>
          <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>

      {/* User */}
      <div className="px-3 pb-4 pt-2 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.05] transition-all cursor-pointer group">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 ring-2 ring-white/10">
            {user ? getInitials(user.full_name || user.email) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/90 text-[12px] font-semibold truncate leading-tight">
              {user?.full_name || user?.email || 'User'}
            </p>
            <p className="text-white/30 text-[10px] truncate capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all p-1 rounded-lg hover:bg-white/5"
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
  accentColor,
}: {
  to: string
  label: string
  icon: React.ElementType
  end?: boolean
  accentColor?: string
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-150 relative group',
          isActive
            ? 'text-white font-semibold'
            : 'text-white/40 hover:text-white/75 hover:bg-white/[0.04] font-medium'
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="sidebar-active"
              className="absolute inset-0 rounded-xl"
              style={{
                background: accentColor
                  ? `linear-gradient(135deg, ${accentColor}22, ${accentColor}0a)`
                  : 'rgba(255,255,255,0.07)',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            />
          )}
          {isActive && accentColor && (
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
              style={{ background: accentColor }}
            />
          )}
          <Icon
            className="w-4 h-4 flex-shrink-0 relative z-10"
            style={isActive && accentColor ? { color: accentColor } : undefined}
          />
          <span className="relative z-10">{label}</span>
          {isActive && accentColor && (
            <div
              className="ml-auto w-1.5 h-1.5 rounded-full relative z-10"
              style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}` }}
            />
          )}
        </>
      )}
    </NavLink>
  )
}
