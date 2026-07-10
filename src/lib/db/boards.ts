import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Board, BoardType } from '@/types'
import { getTemplate, type BoardTemplate } from '@/lib/templates'

// ── Boards in a workspace ───────────────────────────────────────────────────
export function useWorkspaceBoards(workspaceId: string | null) {
  return useQuery({
    queryKey: ['ws-boards', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .order('position')
        .order('created_at')
      if (error) throw error
      return data as Board[]
    },
  })
}

export function useBoard(boardId: string) {
  return useQuery({
    queryKey: ['board', boardId],
    enabled: !!boardId,
    queryFn: async () => {
      const { data, error } = await supabase.from('boards').select('*').eq('id', boardId).single()
      if (error) throw error
      return data as Board
    },
  })
}

// ── Favorites ───────────────────────────────────────────────────────────────
export function useFavorites() {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['favorites', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('board_favorites').select('board_id').eq('user_id', userId!)
      if (error) throw error
      return new Set((data ?? []).map((r) => r.board_id as string))
    },
  })
}

export function useToggleFavorite() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: async ({ boardId, on }: { boardId: string; on: boolean }) => {
      if (on) {
        const { error } = await supabase.from('board_favorites').insert({ user_id: userId, board_id: boardId })
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('board_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('board_id', boardId)
        if (error) throw error
      }
    },
    onMutate: async ({ boardId, on }) => {
      await qc.cancelQueries({ queryKey: ['favorites', userId] })
      const prev = qc.getQueryData<Set<string>>(['favorites', userId])
      const next = new Set(prev ?? [])
      if (on) next.add(boardId)
      else next.delete(boardId)
      qc.setQueryData(['favorites', userId], next)
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['favorites', userId], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['favorites', userId] }),
  })
}

// ── Create board (blank or from template) ───────────────────────────────────
export interface CreateBoardArgs {
  workspaceId: string
  name: string
  templateKey?: string
  type?: BoardType
  color?: string
}

async function provisionTemplate(boardId: string, tpl: BoardTemplate) {
  // columns
  const { data: cols, error: colErr } = await supabase
    .from('board_columns')
    .insert(
      tpl.columns.map((c, i) => ({
        board_id: boardId,
        name: c.name,
        type: c.type,
        position: i,
        width: c.width ?? 160,
        settings: c.settings ?? {},
      }))
    )
    .select()
  if (colErr) throw colErr
  const statusCol = cols?.find((c) => c.type === 'status')

  // groups + items
  for (let gi = 0; gi < tpl.groups.length; gi++) {
    const g = tpl.groups[gi]
    const { data: group, error: gErr } = await supabase
      .from('groups')
      .insert({ board_id: boardId, name: g.name, color: g.color, position: gi })
      .select()
      .single()
    if (gErr) throw gErr
    for (let ii = 0; ii < g.items.length; ii++) {
      const it = g.items[ii]
      const { data: item, error: iErr } = await supabase
        .from('items')
        .insert({ board_id: boardId, group_id: group.id, name: it.name, position: ii })
        .select()
        .single()
      if (iErr) throw iErr
      // seed the status cell to the group's implicit first label if present
      if (statusCol) {
        const firstLabel = Object.keys(statusCol.settings?.labels ?? {})[0]
        if (firstLabel) {
          await supabase
            .from('cell_values')
            .insert({ item_id: item.id, column_id: statusCol.id, value: firstLabel })
        }
      }
    }
  }
}

export function useCreateBoard() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: async ({ workspaceId, name, templateKey, type, color }: CreateBoardArgs) => {
      const tpl = templateKey ? getTemplate(templateKey) : undefined
      const { data: board, error } = await supabase
        .from('boards')
        .insert({
          workspace_id: workspaceId,
          name,
          type: type ?? 'tasks',
          color: color ?? tpl?.color ?? '#0ea5e9',
          template: templateKey ?? null,
          created_by: userId,
        })
        .select()
        .single()
      if (error) throw error // surfaces PLAN_LIMIT errors from the trigger

      if (tpl) {
        await provisionTemplate(board.id, tpl)
      } else {
        // blank board: one group + a Status column
        const { data: group } = await supabase
          .from('groups')
          .insert({ board_id: board.id, name: 'Group 1', color: color ?? '#0ea5e9', position: 0 })
          .select()
          .single()
        await supabase.from('board_columns').insert([
          {
            board_id: board.id,
            name: 'Status',
            type: 'status',
            position: 0,
            settings: {
              labels: { 'Not started': '#94a3b8', 'Working on it': '#f59e0b', Done: '#22c55e' },
            },
          },
          { board_id: board.id, name: 'Owner', type: 'person', position: 1, width: 140 },
          { board_id: board.id, name: 'Due date', type: 'date', position: 2, width: 140 },
        ])
        if (group) {
          await supabase.from('items').insert({ board_id: board.id, group_id: group.id, name: 'First item', position: 0 })
        }
      }
      return board as Board
    },
    onSuccess: (board) => {
      qc.invalidateQueries({ queryKey: ['ws-boards', board.workspace_id] })
    },
  })
}

// ── Update / delete / duplicate ─────────────────────────────────────────────
export function useUpdateBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Board> & { id: string }) => {
      const { data, error } = await supabase.from('boards').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data as Board
    },
    onSuccess: (board) => {
      qc.invalidateQueries({ queryKey: ['ws-boards', board.workspace_id] })
      qc.invalidateQueries({ queryKey: ['board', board.id] })
    },
  })
}

export function useDeleteBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      const { error } = await supabase.from('boards').delete().eq('id', id)
      if (error) throw error
      return workspaceId
    },
    onSuccess: (workspaceId) => qc.invalidateQueries({ queryKey: ['ws-boards', workspaceId] }),
  })
}

export function useDuplicateBoard() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: async (source: Board) => {
      const { data: board, error } = await supabase
        .from('boards')
        .insert({
          workspace_id: source.workspace_id,
          name: `${source.name} (copy)`,
          type: source.type,
          color: source.color,
          description: source.description,
          template: source.template,
          created_by: userId,
        })
        .select()
        .single()
      if (error) throw error

      const [{ data: cols }, { data: groups }, { data: items }] = await Promise.all([
        supabase.from('board_columns').select('*').eq('board_id', source.id),
        supabase.from('groups').select('*').eq('board_id', source.id),
        supabase.from('items').select('*').eq('board_id', source.id),
      ])

      const colMap = new Map<string, string>()
      for (const c of cols ?? []) {
        const { data: nc } = await supabase
          .from('board_columns')
          .insert({ board_id: board.id, name: c.name, type: c.type, position: c.position, width: c.width, settings: c.settings })
          .select()
          .single()
        if (nc) colMap.set(c.id, nc.id)
      }
      const groupMap = new Map<string, string>()
      for (const g of groups ?? []) {
        const { data: ng } = await supabase
          .from('groups')
          .insert({ board_id: board.id, name: g.name, color: g.color, position: g.position })
          .select()
          .single()
        if (ng) groupMap.set(g.id, ng.id)
      }
      for (const it of items ?? []) {
        const { data: ni } = await supabase
          .from('items')
          .insert({ board_id: board.id, group_id: groupMap.get(it.group_id), name: it.name, position: it.position, created_by: userId })
          .select()
          .single()
        if (!ni) continue
        const { data: cells } = await supabase.from('cell_values').select('*').eq('item_id', it.id)
        if (cells?.length) {
          await supabase.from('cell_values').insert(
            cells
              .filter((cv) => colMap.has(cv.column_id))
              .map((cv) => ({ item_id: ni.id, column_id: colMap.get(cv.column_id), value: cv.value }))
          )
        }
      }
      return board as Board
    },
    onSuccess: (board) => qc.invalidateQueries({ queryKey: ['ws-boards', board.workspace_id] }),
  })
}
