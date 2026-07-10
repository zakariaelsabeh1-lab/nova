import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { logActivity } from './activity'
import type { Group, BoardColumn, Item, Cell, ItemWithCells, CellValue, ColumnType, Subitem } from '@/types'

// ── Groups ──────────────────────────────────────────────────────────────────
export function useGroups(boardId: string) {
  return useQuery({
    queryKey: ['groups', boardId],
    enabled: !!boardId,
    queryFn: async () => {
      const { data, error } = await supabase.from('groups').select('*').eq('board_id', boardId).order('position')
      if (error) throw error
      return data as Group[]
    },
  })
}

// ── Columns ─────────────────────────────────────────────────────────────────
export function useBoardColumns(boardId: string) {
  return useQuery({
    queryKey: ['board-columns', boardId],
    enabled: !!boardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('board_columns')
        .select('*')
        .eq('board_id', boardId)
        .order('position')
      if (error) throw error
      return data as BoardColumn[]
    },
  })
}

// ── Items + cells, assembled into ItemWithCells ─────────────────────────────
export function useItems(boardId: string) {
  return useQuery({
    queryKey: ['items', boardId],
    enabled: !!boardId,
    queryFn: async () => {
      const { data: items, error: iErr } = await supabase
        .from('items')
        .select('*')
        .eq('board_id', boardId)
        .order('position')
      if (iErr) throw iErr
      const ids = (items ?? []).map((r) => r.id)
      const { data: cells, error: cErr } = ids.length
        ? await supabase.from('cell_values').select('item_id, column_id, value').in('item_id', ids)
        : { data: [], error: null }
      if (cErr) throw cErr
      const cellsByItem = new Map<string, Record<string, CellValue>>()
      for (const c of (cells ?? []) as Pick<Cell, 'item_id' | 'column_id' | 'value'>[]) {
        const m = cellsByItem.get(c.item_id) ?? {}
        m[c.column_id] = c.value
        cellsByItem.set(c.item_id, m)
      }
      return (items as Item[]).map<ItemWithCells>((it) => ({ ...it, cells: cellsByItem.get(it.id) ?? {} }))
    },
  })
}

// Convenience: fetch everything the board views need together.
export function useBoardData(boardId: string) {
  const groups = useGroups(boardId)
  const columns = useBoardColumns(boardId)
  const items = useItems(boardId)
  return {
    groups: groups.data ?? [],
    columns: columns.data ?? [],
    items: items.data ?? [],
    isLoading: groups.isLoading || columns.isLoading || items.isLoading,
    isError: groups.isError || columns.isError || items.isError,
  }
}

// ── Cell mutation (optimistic) ──────────────────────────────────────────────
export function useSetCell(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      itemId,
      columnId,
      value,
    }: {
      itemId: string
      columnId: string
      value: CellValue
      _meta?: { columnName?: string; old?: CellValue }
    }) => {
      const { error } = await supabase
        .from('cell_values')
        .upsert({ item_id: itemId, column_id: columnId, value, updated_at: new Date().toISOString() })
      if (error) throw error
    },
    onMutate: async ({ itemId, columnId, value }) => {
      await qc.cancelQueries({ queryKey: ['items', boardId] })
      const prev = qc.getQueryData<ItemWithCells[]>(['items', boardId])
      qc.setQueryData<ItemWithCells[]>(['items', boardId], (old) =>
        (old ?? []).map((it) => (it.id === itemId ? { ...it, cells: { ...it.cells, [columnId]: value } } : it))
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['items', boardId], ctx.prev)
    },
    onSuccess: (_d, vars) => {
      if (vars._meta?.columnName) {
        logActivity({
          boardId,
          itemId: vars.itemId,
          action: 'updated',
          field: vars._meta.columnName,
          oldValue: vars._meta.old,
          newValue: vars.value,
        })
      }
    },
  })
}

// ── Item mutations ──────────────────────────────────────────────────────────
export function useCreateItem(boardId: string) {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: async ({ groupId, name, position }: { groupId: string; name: string; position?: number }) => {
      const { data, error } = await supabase
        .from('items')
        .insert({ board_id: boardId, group_id: groupId, name, position: position ?? 0, created_by: userId })
        .select()
        .single()
      if (error) throw error
      logActivity({ boardId, itemId: data.id, action: 'created', newValue: name })
      return data as Item
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items', boardId] }),
  })
}

export function useUpdateItem(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Item> & { id: string }) => {
      const { error } = await supabase.from('items').update(updates).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: ['items', boardId] })
      const prev = qc.getQueryData<ItemWithCells[]>(['items', boardId])
      qc.setQueryData<ItemWithCells[]>(['items', boardId], (old) =>
        (old ?? []).map((it) => (it.id === id ? { ...it, ...updates } : it))
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['items', boardId], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['items', boardId] }),
  })
}

export function useDeleteItem(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('items').delete().eq('id', id)
      if (error) throw error
      logActivity({ boardId, itemId: id, action: 'deleted' })
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['items', boardId] })
      const prev = qc.getQueryData<ItemWithCells[]>(['items', boardId])
      qc.setQueryData<ItemWithCells[]>(['items', boardId], (old) => (old ?? []).filter((it) => it.id !== id))
      return { prev }
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['items', boardId], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['items', boardId] }),
  })
}

// Move item to a (possibly different) group and reorder. Optimistic.
export function useMoveItem(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, groupId, position }: { id: string; groupId: string; position: number }) => {
      const { error } = await supabase.from('items').update({ group_id: groupId, position }).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, groupId, position }) => {
      await qc.cancelQueries({ queryKey: ['items', boardId] })
      const prev = qc.getQueryData<ItemWithCells[]>(['items', boardId])
      qc.setQueryData<ItemWithCells[]>(['items', boardId], (old) =>
        (old ?? []).map((it) => (it.id === id ? { ...it, group_id: groupId, position } : it))
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['items', boardId], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['items', boardId] }),
  })
}

// Persist a batch of item positions (after a drag settle).
export function useReorderItems(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates: { id: string; group_id: string; position: number }[]) => {
      await Promise.all(
        updates.map((u) => supabase.from('items').update({ group_id: u.group_id, position: u.position }).eq('id', u.id))
      )
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['items', boardId] }),
  })
}

// ── Subitems (lightweight checklist under an item) ──────────────────────────
export function useSubitems(itemId: string) {
  return useQuery({
    queryKey: ['subitems', itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subitems')
        .select('*')
        .eq('parent_item_id', itemId)
        .order('position')
      if (error) throw error
      return data as Subitem[]
    },
  })
}

export function useCreateSubitem(itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, position }: { name: string; position: number }) => {
      const { error } = await supabase.from('subitems').insert({ parent_item_id: itemId, name, position, values: { done: false } })
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['subitems', itemId] }),
  })
}

export function useUpdateSubitem(itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Subitem> & { id: string }) => {
      const { error } = await supabase.from('subitems').update(updates).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: ['subitems', itemId] })
      const prev = qc.getQueryData<Subitem[]>(['subitems', itemId])
      qc.setQueryData<Subitem[]>(['subitems', itemId], (old) => (old ?? []).map((s) => (s.id === id ? { ...s, ...updates } : s)))
      return { prev }
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['subitems', itemId], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['subitems', itemId] }),
  })
}

export function useDeleteSubitem(itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subitems').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['subitems', itemId] }),
  })
}

// ── Group mutations ─────────────────────────────────────────────────────────
export function useCreateGroup(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, color, position }: { name: string; color: string; position: number }) => {
      const { data, error } = await supabase
        .from('groups')
        .insert({ board_id: boardId, name, color, position })
        .select()
        .single()
      if (error) throw error
      return data as Group
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups', boardId] }),
  })
}

export function useUpdateGroup(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Group> & { id: string }) => {
      const { error } = await supabase.from('groups').update(updates).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: ['groups', boardId] })
      const prev = qc.getQueryData<Group[]>(['groups', boardId])
      qc.setQueryData<Group[]>(['groups', boardId], (old) =>
        (old ?? []).map((g) => (g.id === id ? { ...g, ...updates } : g))
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['groups', boardId], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['groups', boardId] }),
  })
}

export function useDeleteGroup(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('groups').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['groups', boardId] })
      qc.invalidateQueries({ queryKey: ['items', boardId] })
    },
  })
}

export function useReorderGroups(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates: { id: string; position: number }[]) => {
      await Promise.all(updates.map((u) => supabase.from('groups').update({ position: u.position }).eq('id', u.id)))
    },
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: ['groups', boardId] })
      const prev = qc.getQueryData<Group[]>(['groups', boardId])
      const posMap = new Map(updates.map((u) => [u.id, u.position]))
      qc.setQueryData<Group[]>(['groups', boardId], (old) =>
        [...(old ?? [])].map((g) => (posMap.has(g.id) ? { ...g, position: posMap.get(g.id)! } : g)).sort((a, b) => a.position - b.position)
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['groups', boardId], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['groups', boardId] }),
  })
}

// ── Column mutations ────────────────────────────────────────────────────────
export function useCreateColumn(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      name,
      type,
      position,
      settings,
    }: {
      name: string
      type: ColumnType
      position: number
      settings?: Record<string, unknown>
    }) => {
      const { data, error } = await supabase
        .from('board_columns')
        .insert({ board_id: boardId, name, type, position, settings: settings ?? {} })
        .select()
        .single()
      if (error) throw error
      return data as BoardColumn
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board-columns', boardId] }),
  })
}

export function useUpdateColumn(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BoardColumn> & { id: string }) => {
      const { error } = await supabase.from('board_columns').update(updates).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: ['board-columns', boardId] })
      const prev = qc.getQueryData<BoardColumn[]>(['board-columns', boardId])
      qc.setQueryData<BoardColumn[]>(['board-columns', boardId], (old) =>
        (old ?? []).map((c) => (c.id === id ? { ...c, ...updates } : c))
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['board-columns', boardId], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['board-columns', boardId] }),
  })
}

export function useDeleteColumn(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('board_columns').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['board-columns', boardId] })
      qc.invalidateQueries({ queryKey: ['items', boardId] })
    },
  })
}

export function useReorderColumns(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates: { id: string; position: number }[]) => {
      await Promise.all(updates.map((u) => supabase.from('board_columns').update({ position: u.position }).eq('id', u.id)))
    },
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: ['board-columns', boardId] })
      const prev = qc.getQueryData<BoardColumn[]>(['board-columns', boardId])
      const posMap = new Map(updates.map((u) => [u.id, u.position]))
      qc.setQueryData<BoardColumn[]>(['board-columns', boardId], (old) =>
        [...(old ?? [])].map((c) => (posMap.has(c.id) ? { ...c, position: posMap.get(c.id)! } : c)).sort((a, b) => a.position - b.position)
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['board-columns', boardId], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['board-columns', boardId] }),
  })
}
