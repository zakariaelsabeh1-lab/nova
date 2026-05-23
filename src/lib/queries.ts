import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Board, BoardType, Column, Task, Profile, Comment, Notification } from '@/types'

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

// ── Create board ──────────────────────────────────────────────
export function useCreateBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (board: Partial<Board>) => {
      const { data, error } = await supabase.from('boards').insert(board).select().single()
      if (error) throw error
      return data as Board
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  })
}

// ── Default board definitions ──────────────────────────────────────────────
const DEFAULT_BOARDS: { name: string; type: BoardType; color: string }[] = [
  { name: 'Tasks', type: 'tasks', color: '#0ea5e9' },
  { name: 'Projects', type: 'projects', color: '#8b5cf6' },
  { name: 'Assignments', type: 'assignments', color: '#f59e0b' },
  { name: 'Vacation', type: 'vacation', color: '#22c55e' },
]

const DEFAULT_COLUMNS: Record<BoardType, { name: string; color: string; position: number }[]> = {
  tasks: [
    { name: 'Not Started', color: '#64748b', position: 0 },
    { name: 'In Progress', color: '#0ea5e9', position: 1 },
    { name: 'Review', color: '#8b5cf6', position: 2 },
    { name: 'Done', color: '#22c55e', position: 3 },
  ],
  projects: [
    { name: 'Planning', color: '#64748b', position: 0 },
    { name: 'Active', color: '#0ea5e9', position: 1 },
    { name: 'Review', color: '#8b5cf6', position: 2 },
    { name: 'Complete', color: '#22c55e', position: 3 },
  ],
  assignments: [
    { name: 'Unassigned', color: '#64748b', position: 0 },
    { name: 'Assigned', color: '#0ea5e9', position: 1 },
    { name: 'In Progress', color: '#f59e0b', position: 2 },
    { name: 'Complete', color: '#22c55e', position: 3 },
  ],
  vacation: [
    { name: 'Pending', color: '#64748b', position: 0 },
    { name: 'Approved', color: '#22c55e', position: 1 },
    { name: 'Declined', color: '#ef4444', position: 2 },
  ],
}

export function useEnsureDefaultBoards(userId: string | undefined) {
  const qc = useQueryClient()
  const { data: boards, isSuccess } = useBoards()
  const seeded = useRef(false)

  useEffect(() => {
    if (!userId || !isSuccess || seeded.current) return
    if (boards && boards.length > 0) { seeded.current = true; return }

    seeded.current = true

    const seed = async () => {
      for (const def of DEFAULT_BOARDS) {
        const { data: board } = await supabase
          .from('boards')
          .insert({ name: def.name, type: def.type, color: def.color, created_by: userId })
          .select()
          .single()

        if (board) {
          await supabase.from('columns').insert(
            DEFAULT_COLUMNS[def.type].map((c) => ({ ...c, board_id: board.id }))
          )
        }
      }
      qc.invalidateQueries({ queryKey: ['boards'] })
    }

    seed()
  }, [userId, isSuccess, boards, qc])
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
