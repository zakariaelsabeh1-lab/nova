import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import {
  Plus, Type, CircleDot, User, Calendar, GanttChartSquare, Hash, Flag, CheckSquare, Clock, MoreVertical, Trash2, Pencil, X,
} from 'lucide-react'
import type { BoardColumn, ColumnType } from '@/types'

const COLUMN_TYPES: { type: ColumnType; label: string; icon: typeof Type }[] = [
  { type: 'text', label: 'Text', icon: Type },
  { type: 'status', label: 'Status', icon: CircleDot },
  { type: 'person', label: 'Person', icon: User },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'timeline', label: 'Timeline', icon: GanttChartSquare },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'priority', label: 'Priority', icon: Flag },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'last_updated', label: 'Last updated', icon: Clock },
]

// "+" button at the end of the column header row.
export function AddColumnMenu({ onAdd }: { onAdd: (name: string, type: ColumnType) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="flex items-center justify-center text-[#94a3b8] hover:text-[#0ea5e9] hover:bg-[#0ea5e9]/10 border-l border-[#e8edf3]">
          <Plus className="w-4 h-4" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={4} align="end" className="z-50 w-52 p-1.5 bg-white rounded-xl shadow-xl border border-[#e2e8f0]">
          <p className="px-2 py-1.5 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Add column</p>
          {COLUMN_TYPES.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => { onAdd(label, type); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] text-[#0f172a] hover:bg-[#f1f5f9]"
            >
              <Icon className="w-3.5 h-3.5 text-[#64748b]" />
              {label}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

// "⋮" menu on each column header: rename, edit status labels, delete.
export function ColumnHeaderMenu({
  column,
  onUpdate,
  onDelete,
}: {
  column: BoardColumn
  onUpdate: (id: string, patch: Partial<BoardColumn>) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(column.name)

  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) setRenaming(false) }}>
      <Popover.Trigger asChild>
        <button className="opacity-0 group-hover/col:opacity-100 p-0.5 text-[#94a3b8] hover:text-[#64748b]">
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={4} align="start" className="z-50 w-56 p-1.5 bg-white rounded-xl shadow-xl border border-[#e2e8f0]">
          {renaming ? (
            <div className="p-1.5">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { onUpdate(column.id, { name }); setRenaming(false); setOpen(false) }
                  if (e.key === 'Escape') setRenaming(false)
                }}
                className="w-full px-2 py-1.5 text-[13px] border border-[#e2e8f0] rounded-lg outline-none focus:border-[#0ea5e9]"
              />
            </div>
          ) : (
            <button
              onClick={() => setRenaming(true)}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] text-[#0f172a] hover:bg-[#f1f5f9]"
            >
              <Pencil className="w-3.5 h-3.5 text-[#64748b]" /> Rename
            </button>
          )}

          {column.type === 'status' && <StatusLabelEditor column={column} onUpdate={onUpdate} />}
          {column.type === 'number' && (
            <button
              onClick={() => onUpdate(column.id, { settings: { ...column.settings, showSum: !column.settings.showSum } })}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] text-[#0f172a] hover:bg-[#f1f5f9]"
            >
              <Hash className="w-3.5 h-3.5 text-[#64748b]" />
              {column.settings.showSum ? 'Hide sum' : 'Show sum'}
            </button>
          )}

          <button
            onClick={() => { onDelete(column.id); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] text-[#ef4444] hover:bg-red-50 mt-0.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete column
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

const PALETTE = ['#94a3b8', '#0ea5e9', '#8b5cf6', '#f59e0b', '#22c55e', '#ef4444', '#ec4899', '#14b8a6']

function StatusLabelEditor({
  column,
  onUpdate,
}: {
  column: BoardColumn
  onUpdate: (id: string, patch: Partial<BoardColumn>) => void
}) {
  const labels = column.settings.labels ?? {}
  const [newLabel, setNewLabel] = useState('')

  const setLabels = (next: Record<string, string>) =>
    onUpdate(column.id, { settings: { ...column.settings, labels: next } })

  return (
    <div className="border-t border-[#f1f5f9] mt-1 pt-1.5">
      <p className="px-2 py-1 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Labels</p>
      <div className="space-y-1 max-h-40 overflow-y-auto px-1">
        {Object.entries(labels).map(([lbl, color]) => (
          <div key={lbl} className="flex items-center gap-1.5 px-1">
            <Popover.Root>
              <Popover.Trigger asChild>
                <button className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: color as string }} />
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content className="z-[60] p-1.5 bg-white rounded-xl shadow-xl border border-[#e2e8f0] grid grid-cols-4 gap-1.5">
                  {PALETTE.map((c) => (
                    <button key={c} onClick={() => setLabels({ ...labels, [lbl]: c })} className="w-5 h-5 rounded-full" style={{ background: c }} />
                  ))}
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
            <span className="flex-1 text-[12px] text-[#0f172a] truncate">{lbl}</span>
            <button
              onClick={() => {
                const next = { ...labels }
                delete next[lbl]
                setLabels(next)
              }}
              className="text-[#cbd5e1] hover:text-[#ef4444]"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 px-1 mt-1.5">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newLabel.trim()) {
              setLabels({ ...labels, [newLabel.trim()]: PALETTE[Object.keys(labels).length % PALETTE.length] })
              setNewLabel('')
            }
          }}
          placeholder="+ Add label"
          className="flex-1 px-2 py-1 text-[12px] border border-[#e2e8f0] rounded-lg outline-none focus:border-[#0ea5e9]"
        />
      </div>
    </div>
  )
}
