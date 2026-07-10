import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { logActivity } from './activity'
import { notify } from './notifications'
import type { Update, FileRecord } from '@/types'

// ── Updates (threaded comments) ─────────────────────────────────────────────
export function useUpdates(itemId: string) {
  return useQuery({
    queryKey: ['updates', itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('updates')
        .select('*, user:user_id(id, full_name, avatar_url, email)')
        .eq('item_id', itemId)
        .order('created_at')
      if (error) throw error
      const all = data as Update[]
      // assemble into a two-level thread
      const roots = all.filter((u) => !u.parent_id)
      const byParent = new Map<string, Update[]>()
      for (const u of all) {
        if (u.parent_id) {
          const arr = byParent.get(u.parent_id) ?? []
          arr.push(u)
          byParent.set(u.parent_id, arr)
        }
      }
      return roots.map((r) => ({ ...r, replies: byParent.get(r.id) ?? [] }))
    },
  })
}

export function useCreateUpdate(itemId: string, boardId?: string) {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: async ({
      body,
      parentId,
      mentions,
    }: {
      body: string
      parentId?: string | null
      mentions?: string[]
    }) => {
      const { data, error } = await supabase
        .from('updates')
        .insert({ item_id: itemId, parent_id: parentId ?? null, user_id: user?.id, body, mentions: mentions ?? [] })
        .select()
        .single()
      if (error) throw error
      if (boardId) logActivity({ boardId, itemId, action: 'commented' })
      // notify mentioned users
      for (const uid of mentions ?? []) {
        if (uid === user?.id) continue
        notify({
          userId: uid,
          type: 'mention',
          title: `${user?.full_name ?? 'Someone'} mentioned you`,
          body,
          itemId,
          boardId,
          actorId: user?.id,
        })
      }
      return data as Update
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['updates', itemId] }),
  })
}

export function useDeleteUpdate(itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('updates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['updates', itemId] }),
  })
}

// ── Files ───────────────────────────────────────────────────────────────────
export function useItemFiles(itemId: string) {
  return useQuery({
    queryKey: ['files', itemId],
    enabled: !!itemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('item_id', itemId)
        .order('created_at', { ascending: false })
      if (error) throw error
      const files = data as FileRecord[]
      return files.map((f) => ({
        ...f,
        url: supabase.storage.from('attachments').getPublicUrl(f.path).data.publicUrl,
      }))
    },
  })
}

export function useUploadFile(itemId: string, workspaceId: string) {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: async (file: File) => {
      const path = `${workspaceId}/${itemId}/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from('attachments').upload(path, file)
      if (upErr) throw upErr
      const { data, error } = await supabase
        .from('files')
        .insert({
          workspace_id: workspaceId,
          item_id: itemId,
          name: file.name,
          path,
          mime: file.type,
          size_bytes: file.size,
          uploaded_by: user?.id,
        })
        .select()
        .single()
      if (error) throw error
      return data as FileRecord
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files', itemId] }),
  })
}

export function useDeleteFile(itemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: FileRecord) => {
      await supabase.storage.from('attachments').remove([file.path])
      const { error } = await supabase.from('files').delete().eq('id', file.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['files', itemId] }),
  })
}
