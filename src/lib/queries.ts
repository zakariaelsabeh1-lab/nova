import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Board, Column, Task, Profile, Comment, Notification } from '@/types'

// ── Boards ──────────────────────────────────────────────
export function useBoards() {
  return useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .order('created_at')
      if (error) throw error
      return data as Board[]
    },
  })
}

export function useBoard(boardId: string) {
  return useQuery({
    queryKey: ['boards', boardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .single()
      if (error) throw error
      return data as Board
    },
    enabled: !!boardId,
  })
}

// ── Columns ──────────────────────────────────────────────
export function useColumns(boardId: string) {
  return useQuery({
    queryKey: ['columns', boardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('columns')
        .select('*')
        .eq('board_id', boardId)
        .order('position')
      if (error) throw error
      return data as Column[]
    },
    enabled: !!boardId,
  })
}

export function useCreateColumn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (col: Partial<Column>) => {
      const { data, error } = await supabase.from('columns').insert(col).select().single()
      if (error) throw error
      return data as Column
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['columns', data.board_id] }),
  })
}

// ── Tasks ──────────────────────────────────────────────
export function useTasks(boardId: string) {
  return useQuery({
    queryKey: ['tasks', boardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:assignee_id(id,full_name,avatar_url,email), creator:created_by(id,full_name)')
        .eq('board_id', boardId)
        .order('position')
      if (error) throw error
      return data as Task[]
    },
    enabled: !!boardId,
  })
}

export function useTask(taskId: string) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:assignee_id(*), creator:created_by(*), comments(*, user:user_id(*))')
        .eq('id', taskId)
        .single()
      if (error) throw error
      return data as Task
    },
    enabled: !!taskId,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (task: Partial<Task>) => {
      const { data, error } = await supabase.from('tasks').insert(task).select().single()
      if (error) throw error
      return data as Task
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['tasks', data.board_id] }),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data as Task
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tasks', data.board_id] })
      qc.invalidateQueries({ queryKey: ['task', data.id] })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, boardId }: { id: string; boardId: string }) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
      return boardId
    },
    onSuccess: (boardId) => qc.invalidateQueries({ queryKey: ['tasks', boardId] }),
  })
}

// Move task to different column
export function useMoveTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      taskId,
      columnId,
      position,
      boardId,
    }: {
      taskId: string
      columnId: string
      position: number
      boardId: string
    }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ column_id: columnId, position })
        .eq('id', taskId)
      if (error) throw error
      return boardId
    },
    onSuccess: (boardId) => qc.invalidateQueries({ queryKey: ['tasks', boardId] }),
  })
}

// ── Comments ──────────────────────────────────────────────
export function useComments(taskId: string) {
  return useQuery({
    queryKey: ['comments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*, user:user_id(id,full_name,avatar_url,email)')
        .eq('task_id', taskId)
        .order('created_at')
      if (error) throw error
      return data as Comment[]
    },
    enabled: !!taskId,
  })
}

export function useCreateComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (comment: { task_id: string; user_id: string; content: string }) => {
      const { data, error } = await supabase.from('comments').insert(comment).select().single()
      if (error) throw error
      return data as Comment
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['comments', data.task_id] }),
  })
}

// ── Profiles ──────────────────────────────────────────────
export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name')
      if (error) throw error
      return data as Profile[]
    },
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Profile> & { id: string }) => {
      const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single()
      if (error) throw error
      return data as Profile
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  })
}

// ── Notifications ──────────────────────────────────────────────
export function useNotifications(userId: string) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data as Notification[]
    },
    enabled: !!userId,
  })
}

// ── Board stats for dashboard ──────────────────────────────────────────────
export function useBoardStats() {
  return useQuery({
    queryKey: ['board-stats'],
    queryFn: async () => {
      const { data: tasks } = await supabase.from('tasks').select('status, board_id, due_date, assignee_id')
      if (!tasks) return { open: 0, done: 0, dueThisWeek: 0 }

      const now = new Date()
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const open = tasks.filter((t) => t.status !== 'done').length
      const done = tasks.filter((t) => t.status === 'done').length
      const dueThisWeek = tasks.filter((t) => {
        if (!t.due_date) return false
        const d = new Date(t.due_date)
        return d >= now && d <= weekEnd
      }).length

      return { open, done, dueThisWeek, total: tasks.length }
    },
  })
}
