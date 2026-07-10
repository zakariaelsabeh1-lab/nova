import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Board } from '@/types'

export interface MyWorkItem {
  id: string
  name: string
  board_id: string
  board_name: string
  board_color: string
  status: string | null
  status_color: string | null
  due: string | null
}

export type Bucket = 'overdue' | 'today' | 'week' | 'nextWeek' | 'later' | 'noDate'
export const BUCKET_ORDER: Bucket[] = ['overdue', 'today', 'week', 'nextWeek', 'later', 'noDate']
export const BUCKET_LABEL: Record<Bucket, string> = {
  overdue: 'Overdue',
  today: 'Today',
  week: 'This week',
  nextWeek: 'Next week',
  later: 'Later',
  noDate: 'No date',
}

function bucketFor(due: string | null): Bucket {
  if (!due) return 'noDate'
  const d = new Date(due + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  if (diff <= 7) return 'week'
  if (diff <= 14) return 'nextWeek'
  return 'later'
}

// All items assigned to me across a workspace's boards, bucketed by due date.
export function useMyWork(workspaceId: string | null) {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['my-work', workspaceId, userId],
    enabled: !!workspaceId && !!userId,
    queryFn: async () => {
      const { data: boards } = await supabase.from('boards').select('*').eq('workspace_id', workspaceId!)
      const boardList = (boards ?? []) as Board[]
      if (!boardList.length) return {} as Record<Bucket, MyWorkItem[]>
      const boardIds = boardList.map((b) => b.id)

      const { data: cols } = await supabase
        .from('board_columns')
        .select('id, board_id, type, settings')
        .in('board_id', boardIds)
      const personCols = (cols ?? []).filter((c) => c.type === 'person')
      const dateColByBoard = new Map<string, string>()
      const statusColByBoard = new Map<string, { id: string; labels: Record<string, string> }>()
      for (const c of cols ?? []) {
        if (c.type === 'date' && !dateColByBoard.has(c.board_id)) dateColByBoard.set(c.board_id, c.id)
        if (c.type === 'status' && !statusColByBoard.has(c.board_id))
          statusColByBoard.set(c.board_id, { id: c.id, labels: (c.settings?.labels ?? {}) as Record<string, string> })
      }
      if (!personCols.length) return {} as Record<Bucket, MyWorkItem[]>

      // items assigned to me: person cell value equals my uid
      const { data: assignedCells } = await supabase
        .from('cell_values')
        .select('item_id, column_id, value')
        .in('column_id', personCols.map((c) => c.id))
      const myItemIds = Array.from(
        new Set((assignedCells ?? []).filter((c) => c.value === userId).map((c) => c.item_id))
      )
      if (!myItemIds.length) return {} as Record<Bucket, MyWorkItem[]>

      const { data: items } = await supabase.from('items').select('*').in('id', myItemIds)
      const { data: valueCells } = await supabase
        .from('cell_values')
        .select('item_id, column_id, value')
        .in('item_id', myItemIds)

      const boardById = new Map(boardList.map((b) => [b.id, b]))
      const buckets: Record<Bucket, MyWorkItem[]> = {
        overdue: [], today: [], week: [], nextWeek: [], later: [], noDate: [],
      }
      for (const it of items ?? []) {
        const board = boardById.get(it.board_id)
        if (!board) continue
        const dateColId = dateColByBoard.get(it.board_id)
        const statusInfo = statusColByBoard.get(it.board_id)
        const due = dateColId
          ? ((valueCells ?? []).find((v) => v.item_id === it.id && v.column_id === dateColId)?.value as string | null) ?? null
          : null
        const statusVal = statusInfo
          ? ((valueCells ?? []).find((v) => v.item_id === it.id && v.column_id === statusInfo.id)?.value as string | null) ?? null
          : null
        const mwi: MyWorkItem = {
          id: it.id,
          name: it.name,
          board_id: it.board_id,
          board_name: board.name,
          board_color: board.color,
          status: statusVal,
          status_color: statusVal && statusInfo ? statusInfo.labels[statusVal] ?? null : null,
          due: due ? String(due).slice(0, 10) : null,
        }
        buckets[bucketFor(mwi.due)].push(mwi)
      }
      return buckets
    },
  })
}
