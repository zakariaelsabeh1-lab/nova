import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { getInitials } from '@/lib/utils'

export interface PresenceUser {
  id: string
  name: string
  initials: string
  color: string
}

const PRESENCE_COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#22c55e', '#ef4444', '#ec4899', '#14b8a6']

// Subscribes to a board's data changes (from other clients) + tracks presence.
export function useBoardRealtime(boardId: string): PresenceUser[] {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [present, setPresent] = useState<PresenceUser[]>([])

  useEffect(() => {
    if (!boardId || !user) return

    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ['items', boardId] })
      qc.invalidateQueries({ queryKey: ['groups', boardId] })
      qc.invalidateQueries({ queryKey: ['board-columns', boardId] })
    }

    const channel = supabase
      .channel(`board:${boardId}`, { config: { presence: { key: user.id } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `board_id=eq.${boardId}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups', filter: `board_id=eq.${boardId}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_columns', filter: `board_id=eq.${boardId}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cell_values' }, () =>
        qc.invalidateQueries({ queryKey: ['items', boardId] })
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ id: string; name: string }>()
        const users: PresenceUser[] = []
        Object.values(state).forEach((entries, gi) => {
          const e = entries[0]
          if (e) users.push({ id: e.id, name: e.name, initials: getInitials(e.name), color: PRESENCE_COLORS[gi % PRESENCE_COLORS.length] })
        })
        setPresent(users)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ id: user.id, name: user.full_name || user.email })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [boardId, user, qc])

  return present
}
