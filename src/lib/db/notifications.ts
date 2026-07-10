import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Notification } from '@/types'

// Fire-and-forget notification creator.
export async function notify(n: {
  userId: string
  type: Notification['type']
  title: string
  body: string
  itemId?: string | null
  boardId?: string | null
  workspaceId?: string | null
  actorId?: string | null
  link?: string | null
}) {
  try {
    await supabase.from('notifications').insert({
      user_id: n.userId,
      type: n.type,
      title: n.title,
      body: n.body,
      item_id: n.itemId ?? null,
      board_id: n.boardId ?? null,
      workspace_id: n.workspaceId ?? null,
      actor_id: n.actorId ?? null,
      link: n.link ?? null,
    })
  } catch {
    // best-effort
  }
}

export function useNotifications() {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['notifications', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*, actor:actor_id(id, full_name, avatar_url, email)')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as Notification[]
    },
  })
}

export function useUnreadCount() {
  const { data } = useNotifications()
  return data?.filter((n) => !n.read).length ?? 0
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: async (ids?: string[]) => {
      let q = supabase.from('notifications').update({ read: true }).eq('user_id', userId!)
      if (ids && ids.length) q = q.in('id', ids)
      else q = q.eq('read', false)
      const { error } = await q
      if (error) throw error
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['notifications', userId] })
      const prev = qc.getQueryData<Notification[]>(['notifications', userId])
      qc.setQueryData<Notification[]>(['notifications', userId], (old) =>
        (old ?? []).map((n) => ({ ...n, read: true }))
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['notifications', userId], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['notifications', userId] }),
  })
}
