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
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'

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
      className="w-[240px] flex-shrink-0 flex flex-col h-full bg-[#0f172a] border-r border-white/5"
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#0ea5e9] flex items-center justify-center shadow-lg shadow-sky-500/30">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="text-white font-semibold text-[15px] tracking-tight">Nova</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Main */}
        <SidebarLink to="/" label="Dashboard" icon={LayoutDashboard} end />

        {/* Boards label */}
        <div className="px-3 pt-4 pb-1">
          <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Boards</span>
        </div>

        {boardLinks.map((link) => (
          <SidebarLink
            key={link.to}
            to={link.to}
            label={link.label}
            icon={link.icon}
            accentColor={link.color}
          />
        ))}

        {/* Spacer */}
        <div className="px-3 pt-4 pb-1">
          <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Workspace</span>
        </div>

        <SidebarLink to="/team" label="Team" icon={Users} />
        <SidebarLink to="/settings" label="Settings" icon={Settings} />
      </nav>

      {/* Notifications hint */}
      <div className="px-3 pb-1">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors text-sm">
          <Bell className="w-4 h-4 flex-shrink-0" />
          <span>Notifications</span>
        </button>
      </div>

      {/* User */}
      <div className="px-3 pb-4 pt-2 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
          <div className="w-7 h-7 rounded-full bg-[#0ea5e9] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {user ? getInitials(user.full_name || user.email) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-medium truncate leading-tight">
              {user?.full_name || 'User'}
            </p>
            <p className="text-white/30 text-[11px] truncate">{user?.role}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition-all"
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
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
          isActive
            ? 'bg-white/10 text-white font-medium'
            : 'text-white/50 hover:text-white/80 hover:bg-white/5'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className="w-4 h-4 flex-shrink-0"
            style={isActive && accentColor ? { color: accentColor } : undefined}
          />
          <span>{label}</span>
          {isActive && accentColor && (
            <div
              className="ml-auto w-1.5 h-1.5 rounded-full"
              style={{ background: accentColor }}
            />
          )}
        </>
      )}
    </NavLink>
  )
}
