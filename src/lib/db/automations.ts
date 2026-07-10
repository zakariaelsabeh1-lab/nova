import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { notify } from './notifications'
import type { Automation, AutomationRun, AutomationTrigger, AutomationAction, ItemWithCells } from '@/types'

export function useAutomations(boardId: string) {
  return useQuery({
    queryKey: ['automations', boardId],
    enabled: !!boardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('board_id', boardId)
        .order('created_at')
      if (error) throw error
      return data as Automation[]
    },
  })
}

export function useCreateAutomation(boardId: string) {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: async ({
      name,
      trigger,
      actions,
    }: {
      name: string
      trigger: AutomationTrigger
      actions: AutomationAction[]
    }) => {
      const { data, error } = await supabase
        .from('automations')
        .insert({ board_id: boardId, name, trigger, actions, created_by: userId })
        .select()
        .single()
      if (error) throw error // surfaces PLAN_LIMIT
      return data as Automation
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations', boardId] }),
  })
}

export function useToggleAutomation(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from('automations').update({ enabled }).eq('id', id)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['automations', boardId] }),
  })
}

export function useDeleteAutomation(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('automations').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['automations', boardId] }),
  })
}

export function useAutomationRuns(boardId: string) {
  return useQuery({
    queryKey: ['automation-runs', boardId],
    enabled: !!boardId,
    queryFn: async () => {
      const { data: autos } = await supabase.from('automations').select('id').eq('board_id', boardId)
      const ids = (autos ?? []).map((a) => a.id)
      if (!ids.length) return []
      const { data, error } = await supabase
        .from('automation_runs')
        .select('*')
        .in('automation_id', ids)
        .order('created_at', { ascending: false })
        .limit(30)
      if (error) throw error
      return data as AutomationRun[]
    },
  })
}

// ── Execution engine (client-side, runs on a status-cell change) ────────────
// Given the automations for a board and a status change on an item, run any
// matching recipe. Returns the ids of groups the item should move to (if any).
export async function runAutomationsForStatusChange(params: {
  boardId: string
  automations: Automation[]
  item: ItemWithCells
  columnId: string
  newStatus: string
  actorId?: string
  ownerFromColumn: (item: ItemWithCells, columnId: string) => string | null
  setCell: (itemId: string, columnId: string, value: unknown) => Promise<void>
  moveToGroup: (itemId: string, groupId: string) => Promise<void>
}) {
  const matching = params.automations.filter(
    (a) =>
      a.enabled &&
      a.trigger.type === 'status_changes' &&
      a.trigger.columnId === params.columnId &&
      a.trigger.to === params.newStatus
  )
  for (const auto of matching) {
    try {
      for (const action of auto.actions) {
        if (action.type === 'notify_person' && action.columnId) {
          const uid = params.ownerFromColumn(params.item, action.columnId)
          if (uid) {
            await notify({
              userId: uid,
              type: 'automation',
              title: `Automation: ${auto.name}`,
              body: `"${params.item.name}" moved to ${params.newStatus}`,
              itemId: params.item.id,
              boardId: params.boardId,
              actorId: params.actorId,
            })
          }
        } else if (action.type === 'move_to_group' && action.groupId) {
          await params.moveToGroup(params.item.id, action.groupId)
        } else if (action.type === 'set_date' && action.columnId) {
          const value = action.value === 'today' ? new Date().toISOString().slice(0, 10) : action.value
          await params.setCell(params.item.id, action.columnId, value)
        }
      }
      await supabase
        .from('automation_runs')
        .insert({ automation_id: auto.id, item_id: params.item.id, status: 'success', detail: `Ran ${auto.actions.length} action(s)` })
    } catch (e) {
      await supabase
        .from('automation_runs')
        .insert({ automation_id: auto.id, item_id: params.item.id, status: 'error', detail: String(e) })
    }
  }
}
