import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Activity, CellValue } from '@/types'

// Fire-and-forget activity logger. Never throws into the UI path.
export async function logActivity(entry: {
  boardId: string
  itemId?: string | null
  action: string
  field?: string | null
  oldValue?: unknown
  newValue?: unknown
}) {
  try {
    const userId = useAuthStore.getState().user?.id ?? null
    await supabase.from('activity_log').insert({
      board_id: entry.boardId,
      item_id: entry.itemId ?? null,
      user_id: userId,
      action: entry.action,
      field: entry.field ?? null,
      old_value: entry.oldValue ?? null,
      new_value: entry.newValue ?? null,
    })
  } catch {
    // logging must never break the mutation it accompanies
  }
}

export function useItemActivity(itemId: string) {
  return useQuery({
    queryKey: ['activity', itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*, user:user_id(id, full_name, avatar_url, email)')
        .eq('item_id', itemId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as Activity[]
    },
  })
}

export function useBoardActivity(boardId: string) {
  return useQuery({
    queryKey: ['board-activity', boardId],
    enabled: !!boardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*, user:user_id(id, full_name, avatar_url, email)')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false })
        .limit(30)
      if (error) throw error
      return data as Activity[]
    },
  })
}

// Human-readable rendering of a logged value.
export function formatActivityValue(v: CellValue | unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'object') {
    const t = v as { from?: string; to?: string }
    if (t.from || t.to) return `${t.from ?? '?'} → ${t.to ?? '?'}`
    return JSON.stringify(v)
  }
  return String(v)
}
