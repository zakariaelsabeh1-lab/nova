import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Zap, Plus, Trash2, Loader2, Wand2, CheckCircle2, XCircle } from 'lucide-react'
import { useBoardColumns, useGroups } from '@/lib/db/board-data'
import { useAutomations, useCreateAutomation, useToggleAutomation, useDeleteAutomation, useAutomationRuns } from '@/lib/db/automations'
import { formatDateTime } from '@/lib/utils'
import { notifyError, notifySuccess, errorMessage } from '@/lib/toast'
import type { AutomationAction, AutomationActionType, BoardColumn } from '@/types'

export function AutomationsPanel({ boardId, onClose }: { boardId: string; onClose: () => void }) {
  const { data: columns = [] } = useBoardColumns(boardId)
  const { data: groups = [] } = useGroups(boardId)
  const { data: automations = [] } = useAutomations(boardId)
  const { data: runs = [] } = useAutomationRuns(boardId)
  const create = useCreateAutomation(boardId)
  const toggle = useToggleAutomation(boardId)
  const del = useDeleteAutomation(boardId)

  const statusCols = columns.filter((c) => c.type === 'status')
  const personCols = columns.filter((c) => c.type === 'person')
  const dateCols = columns.filter((c) => c.type === 'date')

  const [building, setBuilding] = useState(false)

  const addPrebuilt = async () => {
    const statusCol = statusCols[0]
    if (!statusCol) return notifyError('Add a Status column first')
    const labels = Object.keys(statusCol.settings.labels ?? {})
    const doneLabel = labels.find((l) => /done|complete|won|publish/i.test(l)) ?? labels[labels.length - 1]
    const stuckLabel = labels.find((l) => /stuck|blocked|lost/i.test(l)) ?? labels[0]
    const recipes: { name: string; to: string; actions: AutomationAction[] }[] = []
    if (doneLabel && personCols[0]) recipes.push({ name: `Notify owner when ${doneLabel}`, to: doneLabel, actions: [{ type: 'notify_person', columnId: personCols[0].id }] })
    if (doneLabel && groups.length) recipes.push({ name: `Move to "${groups[groups.length - 1].name}" when ${doneLabel}`, to: doneLabel, actions: [{ type: 'move_to_group', groupId: groups[groups.length - 1].id }] })
    if (stuckLabel && dateCols[0]) recipes.push({ name: `Set date when ${stuckLabel}`, to: stuckLabel, actions: [{ type: 'set_date', columnId: dateCols[0].id, value: 'today' }] })
    try {
      for (const r of recipes) {
        await create.mutateAsync({ name: r.name, trigger: { type: 'status_changes', columnId: statusCol.id, to: r.to }, actions: r.actions })
      }
      notifySuccess(`Added ${recipes.length} prebuilt recipes`)
    } catch (e) {
      notifyError(errorMessage(e))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="relative w-full max-w-[520px] h-full bg-white shadow-2xl flex flex-col"
      >
        <div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#8b5cf6]/12 flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#8b5cf6]" />
            </div>
            <h2 className="text-[16px] font-bold text-[#0f172a]">Automations</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f1f5f9] text-[#64748b]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex gap-2">
            <button onClick={() => setBuilding((b) => !b)} className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-white rounded-xl" style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}>
              <Plus className="w-4 h-4" /> New recipe
            </button>
            <button onClick={addPrebuilt} disabled={create.isPending} className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold text-[#8b5cf6] bg-[#8b5cf6]/10 rounded-xl disabled:opacity-60">
              {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Add prebuilt
            </button>
          </div>

          {building && (
            <RecipeBuilder
              statusCols={statusCols}
              personCols={personCols}
              dateCols={dateCols}
              groups={groups}
              onCancel={() => setBuilding(false)}
              onCreate={async (name, columnId, to, actions) => {
                try {
                  await create.mutateAsync({ name, trigger: { type: 'status_changes', columnId, to }, actions })
                  notifySuccess('Automation created')
                  setBuilding(false)
                } catch (e) {
                  notifyError(errorMessage(e))
                }
              }}
            />
          )}

          {/* Existing */}
          <div className="space-y-2">
            {automations.length === 0 && !building && (
              <p className="text-center text-[13px] text-[#94a3b8] py-8">No automations yet. Create one or add prebuilt recipes.</p>
            )}
            {automations.map((a) => (
              <div key={a.id} className="rounded-xl border border-[#e2e8f0] p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#0f172a]">{a.name}</p>
                    <p className="text-[12px] text-[#94a3b8] mt-0.5">When status becomes <span className="font-semibold text-[#64748b]">{a.trigger.to}</span> → {a.actions.map((ac) => actionLabel(ac)).join(', ')}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => toggle.mutate({ id: a.id, enabled: !a.enabled })} className="relative w-9 h-5 rounded-full transition-colors" style={{ background: a.enabled ? '#22c55e' : '#e2e8f0' }}>
                      <motion.div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow" animate={{ left: a.enabled ? 18 : 2 }} />
                    </button>
                    <button onClick={() => del.mutate(a.id)} className="text-[#cbd5e1] hover:text-[#ef4444] p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Run log */}
          {runs.length > 0 && (
            <div>
              <h3 className="text-[12px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Run log</h3>
              <div className="space-y-1.5">
                {runs.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-[12px]">
                    {r.status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" /> : <XCircle className="w-3.5 h-3.5 text-[#ef4444]" />}
                    <span className="text-[#64748b] flex-1 truncate">{r.detail}</span>
                    <span className="text-[#cbd5e1]">{formatDateTime(r.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function actionLabel(a: AutomationAction): string {
  if (a.type === 'notify_person') return 'notify owner'
  if (a.type === 'move_to_group') return 'move group'
  if (a.type === 'set_date') return 'set date'
  return a.type
}

function RecipeBuilder({
  statusCols,
  personCols,
  dateCols,
  groups,
  onCancel,
  onCreate,
}: {
  statusCols: BoardColumn[]
  personCols: BoardColumn[]
  dateCols: BoardColumn[]
  groups: { id: string; name: string }[]
  onCancel: () => void
  onCreate: (name: string, columnId: string, to: string, actions: AutomationAction[]) => void
}) {
  const [columnId, setColumnId] = useState(statusCols[0]?.id ?? '')
  const statusCol = statusCols.find((c) => c.id === columnId)
  const labels = Object.keys(statusCol?.settings.labels ?? {})
  const [to, setTo] = useState(labels[0] ?? '')
  const [actionType, setActionType] = useState<AutomationActionType>('notify_person')
  const [targetCol, setTargetCol] = useState(personCols[0]?.id ?? '')
  const [targetGroup, setTargetGroup] = useState(groups[0]?.id ?? '')

  const build = () => {
    if (!columnId || !to) return
    let action: AutomationAction
    if (actionType === 'notify_person') action = { type: 'notify_person', columnId: targetCol || personCols[0]?.id }
    else if (actionType === 'move_to_group') action = { type: 'move_to_group', groupId: targetGroup || groups[0]?.id }
    else action = { type: 'set_date', columnId: targetCol || dateCols[0]?.id, value: 'today' }
    const name = `When ${to} → ${actionLabel(action)}`
    onCreate(name, columnId, to, [action])
  }

  if (!statusCols.length) {
    return <div className="rounded-xl bg-[#fef2f2] text-[#ef4444] text-[13px] p-3">Add a Status column to build automations.</div>
  }

  return (
    <div className="rounded-2xl border border-[#e2e8f0] p-4 bg-[#f8fafc] space-y-3">
      <div className="flex items-center gap-2 text-[13px]">
        <span className="font-bold text-[#8b5cf6]">When</span>
        <select value={columnId} onChange={(e) => { setColumnId(e.target.value); }} className="px-2 py-1.5 rounded-lg border border-[#e2e8f0] bg-white outline-none">
          {statusCols.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="text-[#64748b]">becomes</span>
        <select value={to} onChange={(e) => setTo(e.target.value)} className="px-2 py-1.5 rounded-lg border border-[#e2e8f0] bg-white outline-none">
          {labels.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2 text-[13px] flex-wrap">
        <span className="font-bold text-[#8b5cf6]">Then</span>
        <select value={actionType} onChange={(e) => setActionType(e.target.value as AutomationActionType)} className="px-2 py-1.5 rounded-lg border border-[#e2e8f0] bg-white outline-none">
          <option value="notify_person">notify person</option>
          <option value="move_to_group">move to group</option>
          <option value="set_date">set date to today</option>
        </select>
        {actionType === 'notify_person' && (
          <select value={targetCol} onChange={(e) => setTargetCol(e.target.value)} className="px-2 py-1.5 rounded-lg border border-[#e2e8f0] bg-white outline-none">
            {personCols.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        {actionType === 'move_to_group' && (
          <select value={targetGroup} onChange={(e) => setTargetGroup(e.target.value)} className="px-2 py-1.5 rounded-lg border border-[#e2e8f0] bg-white outline-none">
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        {actionType === 'set_date' && (
          <select value={targetCol} onChange={(e) => setTargetCol(e.target.value)} className="px-2 py-1.5 rounded-lg border border-[#e2e8f0] bg-white outline-none">
            {dateCols.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-[12px] font-semibold text-[#64748b] rounded-lg hover:bg-white">Cancel</button>
        <button onClick={build} className="px-4 py-1.5 text-[12px] font-semibold text-white rounded-lg" style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}>Create</button>
      </div>
    </div>
  )
}
