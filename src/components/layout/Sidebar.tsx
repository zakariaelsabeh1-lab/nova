import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import * as Popover from '@radix-ui/react-popover'
import {
  LayoutDashboard, Users, Settings, Loader2, Plus, Star, Search, ChevronsUpDown,
  Check, CreditCard, CircleUser, LogOut,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useCurrentWorkspace, usePlan } from '@/lib/db/workspaces'
import { useWorkspaceBoards, useFavorites } from '@/lib/db/boards'
import { getInitials, cn } from '@/lib/utils'
import { NotificationBell } from './NotificationBell'
import { CreateBoardModal } from '@/components/board/CreateBoardModal'
import type { ElementType } from 'react'
import type { Board } from '@/types'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false))
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = () => setIsMobile(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, signOut } = useAuthStore()
  const { workspace, workspaces } = useCurrentWorkspace()
  const { data: boards = [], isLoading: boardsLoading } = useWorkspaceBoards(workspace?.id ?? null)
  const { data: favorites } = useFavorites()
  const { isPro } = usePlan(workspace?.id ?? null)
  const isMobile = useIsMobile()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const handleNavClick = () => { if (isMobile) onClose() }

  const filtered = boards.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
  const favBoards = filtered.filter((b) => favorites?.has(b.id))

  return (
    <>
      <motion.aside
        className="w-[248px] flex-shrink-0 flex flex-col bg-[#080e1a] fixed md:relative h-full z-40 md:z-auto shadow-[4px_0_32px_rgba(0,0,0,0.4)] md:shadow-none"
        initial={isMobile ? { x: -248 } : { x: 0 }}
        animate={isMobile ? { x: isOpen ? 0 : -248 } : { x: 0 }}
        transition={{ duration: isMobile ? 0.28 : 0, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Workspace switcher */}
        <WorkspaceSwitcher current={workspace?.name ?? 'Workspace'} isPro={isPro} workspaces={workspaces} />

        {/* Nav */}
        <nav className="relative flex-1 px-3 py-3 overflow-y-auto">
          <SidebarLink to="/" label="Dashboard" icon={LayoutDashboard} end onClose={handleNavClick} />
          <SidebarLink to="/my-work" label="My Work" icon={CircleUser} onClose={handleNavClick} />

          {/* Board search */}
          <div className="relative mt-4 mb-2 px-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search boards…"
              className="w-full pl-8 pr-2 py-1.5 text-[12.5px] rounded-lg bg-white/[0.04] text-white placeholder-white/25 outline-none focus:bg-white/[0.06]"
            />
          </div>

          {favBoards.length > 0 && (
            <>
              <SectionLabel>Favorites</SectionLabel>
              <div className="space-y-0.5 mb-2">
                {favBoards.map((b) => (
                  <BoardLink key={b.id} board={b} favorite onClose={handleNavClick} />
                ))}
              </div>
            </>
          )}

          <div className="flex items-center justify-between px-3 mt-3 mb-1.5">
            <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.15em]">Boards</span>
            <button onClick={() => setShowCreate(true)} className="text-white/30 hover:text-[#0ea5e9]" title="Add board">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {boardsLoading ? (
            <div className="flex items-center gap-3 px-3 py-2.5">
              <Loader2 className="w-4 h-4 text-white/20 animate-spin" />
              <span className="text-[13px] text-white/20">Loading…</span>
            </div>
          ) : filtered.length === 0 ? (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.04] text-[13px]"
            >
              <Plus className="w-3.5 h-3.5" /> {search ? 'No matches' : 'Add your first board'}
            </button>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((b) => (
                <BoardLink key={b.id} board={b} favorite={favorites?.has(b.id)} onClose={handleNavClick} />
              ))}
            </div>
          )}

          <SectionLabel className="mt-5">Workspace</SectionLabel>
          <div className="space-y-0.5">
            <SidebarLink to="/team" label="Team" icon={Users} onClose={handleNavClick} />
            <SidebarLink to="/billing" label="Billing" icon={CreditCard} onClose={handleNavClick} />
            <SidebarLink to="/settings" label="Settings" icon={Settings} onClose={handleNavClick} />
          </div>
        </nav>

        {/* Notifications */}
        <div className="relative px-3 pb-1">
          <NotificationBell />
        </div>

        {/* User */}
        <div className="relative px-3 pb-4 pt-2 border-t border-white/[0.05]">
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl">
            <div className="relative w-8 h-8 flex-shrink-0">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] flex items-center justify-center text-white text-[11px] font-bold">
                  {user ? getInitials(user.full_name || user.email) : 'U'}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#22c55e] rounded-full border-2 border-[#080e1a]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/85 text-[12px] font-semibold truncate leading-tight">{user?.full_name || user?.email || 'User'}</p>
              <p className="text-white/25 text-[10px] truncate">{user?.email}</p>
            </div>
            <button onClick={() => signOut()} className="text-white/30 hover:text-[#ef4444] p-1" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.aside>

      {showCreate && workspace && <CreateBoardModal workspaceId={workspace.id} onClose={() => setShowCreate(false)} />}
    </>
  )
}

function WorkspaceSwitcher({ current, isPro, workspaces }: { current: string; isPro: boolean; workspaces: { id: string; name: string }[] }) {
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace)
  const currentId = useWorkspaceStore((s) => s.currentWorkspaceId)
  const [open, setOpen] = useState(false)
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="flex items-center gap-2.5 px-4 py-4 border-b border-white/[0.05] hover:bg-white/[0.02] w-full">
          <div className="relative w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0ea5e9] to-[#6366f1]" />
            <span className="relative text-white font-black text-[13px] z-10">{current[0]?.toUpperCase() ?? 'N'}</span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-white font-bold text-[14px] tracking-tight truncate">{current}</span>
              {isPro && <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-[#f59e0b]/20 text-[#f59e0b] uppercase tracking-wide">Pro</span>}
            </div>
            <span className="text-[10px] text-white/30 font-medium">Workspace</span>
          </div>
          <ChevronsUpDown className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={4} className="z-50 w-[220px] bg-white rounded-xl shadow-2xl border border-[#e2e8f0] p-1.5">
          <p className="px-2 py-1 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Workspaces</p>
          {workspaces.map((w) => (
            <button
              key={w.id}
              onClick={() => { setWorkspace(w.id); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-[13px] hover:bg-[#f1f5f9]"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] flex items-center justify-center text-white text-[10px] font-bold">
                {w.name[0]?.toUpperCase()}
              </div>
              <span className="flex-1 text-left text-[#0f172a] truncate">{w.name}</span>
              {currentId === w.id && <Check className="w-3.5 h-3.5 text-[#0ea5e9]" />}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-3 mb-1.5', className)}><span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.15em]">{children}</span></div>
}

function BoardLink({ board, favorite, onClose }: { board: Board; favorite?: boolean; onClose?: () => void }) {
  return (
    <NavLink
      to={`/board/${board.id}`}
      onClick={onClose}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-2.5 px-3 py-2 min-h-[40px] rounded-xl text-[13px] font-medium transition-all group',
          isActive ? 'text-white bg-white/[0.06]' : 'text-white/45 hover:text-white/80 hover:bg-white/[0.03]'
        )
      }
    >
      <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: board.color }} />
      <span className="flex-1 truncate">{board.name}</span>
      {favorite && <Star className="w-3 h-3 flex-shrink-0" style={{ fill: '#f59e0b', color: '#f59e0b' }} />}
    </NavLink>
  )
}

function SidebarLink({ to, label, icon: Icon, end = false, onClose }: { to: string; label: string; icon: ElementType; end?: boolean; onClose?: () => void }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClose}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 px-3 py-2.5 min-h-[42px] rounded-xl text-[13px] font-medium transition-all group',
          isActive ? 'text-white bg-white/[0.07]' : 'text-white/45 hover:text-white/80 hover:bg-white/[0.04]'
        )
      }
    >
      <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0 group-hover:bg-white/[0.07] transition-colors">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <span>{label}</span>
    </NavLink>
  )
}
