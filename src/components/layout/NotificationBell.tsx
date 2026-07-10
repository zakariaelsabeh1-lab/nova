import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Popover from '@radix-ui/react-popover'
import { motion } from 'framer-motion'
import { Bell, AtSign, UserPlus, Zap, CheckCheck } from 'lucide-react'
import { useNotifications, useUnreadCount, useMarkNotificationsRead } from '@/lib/db/notifications'
import { formatDateTime } from '@/lib/utils'
import type { Notification } from '@/types'

const ICON: Record<Notification['type'], typeof Bell> = {
  mention: AtSign,
  assignment: UserPlus,
  automation: Zap,
  digest: Bell,
}

export function NotificationBell() {
  const { data: notifications = [] } = useNotifications()
  const unread = useUnreadCount()
  const markRead = useMarkNotificationsRead()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.04] transition-all">
          <div className="relative">
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-1 bg-[#ef4444] rounded-full border border-[#080e1a] flex items-center justify-center text-[8px] font-black text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>
          <span className="text-[13px] font-medium">Notifications</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="right" align="end" sideOffset={12} className="z-50 w-[340px] bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#f1f5f9]">
            <span className="text-[14px] font-bold text-[#0f172a]">Notifications</span>
            {unread > 0 && (
              <button onClick={() => markRead.mutate(undefined)} className="flex items-center gap-1 text-[12px] font-semibold text-[#0ea5e9] hover:text-[#0284c7]">
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-8 h-8 mx-auto mb-2 text-[#e2e8f0]" />
                <p className="text-[13px] text-[#94a3b8]">You're all caught up</p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = ICON[n.type] ?? Bell
                return (
                  <motion.button
                    key={n.id}
                    onClick={() => {
                      if (!n.read) markRead.mutate([n.id])
                      if (n.board_id) navigate(`/board/${n.board_id}`)
                      setOpen(false)
                    }}
                    className="w-full flex items-start gap-3 px-4 py-3 border-b border-[#f8fafc] last:border-0 hover:bg-[#fafcff] text-left"
                    style={{ background: n.read ? 'transparent' : 'rgba(14,165,233,0.04)' }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#f1f5f9] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-[#64748b]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#0f172a] leading-snug">{n.title}</p>
                      <p className="text-[12px] text-[#64748b] truncate mt-0.5">{n.body}</p>
                      <span className="text-[11px] text-[#cbd5e1]">{formatDateTime(n.created_at)}</span>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-[#0ea5e9] flex-shrink-0 mt-1.5" />}
                  </motion.button>
                )
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
