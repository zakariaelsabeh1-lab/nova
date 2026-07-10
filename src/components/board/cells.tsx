import { useState, useRef, useEffect } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Check, Calendar as CalIcon, X } from 'lucide-react'
import { format, isBefore, startOfToday, parseISO } from 'date-fns'
import type { BoardColumn, CellValue, ItemWithCells, WorkspaceMember, TaskPriority } from '@/types'
import { getInitials } from '@/lib/utils'

export interface CellProps {
  column: BoardColumn
  value: CellValue
  item: ItemWithCells
  members: WorkspaceMember[]
  onChange: (value: CellValue) => void
  readOnly?: boolean
}

const AVATAR_GRAD = 'linear-gradient(135deg, #0ea5e9, #6366f1)'

const PRIORITY: Record<TaskPriority, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: '#ef4444' },
  high: { label: 'High', color: '#f59e0b' },
  medium: { label: 'Medium', color: '#0ea5e9' },
  low: { label: 'Low', color: '#64748b' },
}

// ── Text ────────────────────────────────────────────────────────────────────
function TextCell({ value, onChange, readOnly }: CellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value ?? ''))
  useEffect(() => setDraft(String(value ?? '')), [value])

  if (readOnly || !editing) {
    return (
      <button
        disabled={readOnly}
        onClick={() => setEditing(true)}
        className="w-full h-full px-3 text-left text-[13px] text-[#0f172a] truncate hover:bg-[#f8fafc] disabled:cursor-default"
      >
        {String(value ?? '') || <span className="text-[#cbd5e1]">—</span>}
      </button>
    )
  }
  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { setEditing(false); if (draft !== String(value ?? '')) onChange(draft) }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.currentTarget.blur() }
        if (e.key === 'Escape') { setDraft(String(value ?? '')); setEditing(false) }
      }}
      className="w-full h-full px-3 text-[13px] text-[#0f172a] outline-none bg-white ring-2 ring-[#0ea5e9]/40 rounded"
    />
  )
}

// ── Number ──────────────────────────────────────────────────────────────────
function NumberCell({ value, column, onChange, readOnly }: CellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value == null ? '' : String(value))
  useEffect(() => setDraft(value == null ? '' : String(value)), [value])
  const unit = column.settings.unit ?? ''

  if (readOnly || !editing) {
    return (
      <button
        disabled={readOnly}
        onClick={() => setEditing(true)}
        className="w-full h-full px-3 text-right text-[13px] font-medium text-[#0f172a] tabular-nums hover:bg-[#f8fafc] disabled:cursor-default"
      >
        {value == null || value === '' ? <span className="text-[#cbd5e1]">—</span> : `${unit}${value}`}
      </button>
    )
  }
  return (
    <input
      autoFocus
      type="number"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { setEditing(false); const n = draft === '' ? null : Number(draft); if (n !== value) onChange(n) }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') { setDraft(value == null ? '' : String(value)); setEditing(false) }
      }}
      className="w-full h-full px-3 text-right text-[13px] text-[#0f172a] outline-none bg-white ring-2 ring-[#0ea5e9]/40 rounded tabular-nums"
    />
  )
}

// ── Status ──────────────────────────────────────────────────────────────────
function StatusCell({ value, column, onChange, readOnly }: CellProps) {
  const labels = column.settings.labels ?? {}
  const label = typeof value === 'string' ? value : ''
  const color = labels[label] ?? '#cbd5e1'
  const [open, setOpen] = useState(false)

  const pill = (
    <div
      className="w-full h-full flex items-center justify-center text-[12px] font-semibold text-white"
      style={{ background: label ? color : 'transparent', color: label ? '#fff' : '#cbd5e1' }}
    >
      {label || '—'}
    </div>
  )
  if (readOnly) return pill
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="w-full h-full">{pill}</button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={4} className="z-50 w-44 p-1.5 bg-white rounded-xl shadow-xl border border-[#e2e8f0]">
          {Object.entries(labels).map(([lbl, c]) => (
            <button
              key={lbl}
              onClick={() => { onChange(lbl); setOpen(false) }}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-[13px] font-medium text-white mb-1 last:mb-0"
              style={{ background: c as string }}
            >
              <span className="flex-1 text-left">{lbl}</span>
              {label === lbl && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
          {label && (
            <button
              onClick={() => { onChange(null); setOpen(false) }}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-[12px] font-medium text-[#94a3b8] hover:bg-[#f1f5f9]"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

// ── Priority ────────────────────────────────────────────────────────────────
function PriorityCell({ value, onChange, readOnly }: CellProps) {
  const key = (typeof value === 'string' ? value : 'medium') as TaskPriority
  const p = PRIORITY[key] ?? PRIORITY.medium
  const [open, setOpen] = useState(false)
  const pill = (
    <div className="w-full h-full flex items-center justify-center">
      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: p.color + '1a', color: p.color }}>
        {value ? p.label : '—'}
      </span>
    </div>
  )
  if (readOnly) return pill
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="w-full h-full">{pill}</button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={4} className="z-50 w-36 p-1.5 bg-white rounded-xl shadow-xl border border-[#e2e8f0]">
          {(Object.keys(PRIORITY) as TaskPriority[]).map((k) => (
            <button
              key={k}
              onClick={() => { onChange(k); setOpen(false) }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] hover:bg-[#f1f5f9]"
            >
              <span className="w-2 h-2 rounded-full" style={{ background: PRIORITY[k].color }} />
              <span className="flex-1 text-left text-[#0f172a]">{PRIORITY[k].label}</span>
              {key === k && value && <Check className="w-3.5 h-3.5 text-[#0ea5e9]" />}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

// ── Person ──────────────────────────────────────────────────────────────────
function PersonCell({ value, members, onChange, readOnly }: CellProps) {
  const uid = typeof value === 'string' ? value : ''
  const member = members.find((m) => m.user_id === uid)
  const [open, setOpen] = useState(false)

  const avatar = (
    <div className="w-full h-full flex items-center justify-center">
      {member?.profile ? (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ background: AVATAR_GRAD }} title={member.profile.full_name}>
          {getInitials(member.profile.full_name || member.profile.email)}
        </div>
      ) : (
        <div className="w-7 h-7 rounded-full border-2 border-dashed border-[#e2e8f0]" />
      )}
    </div>
  )
  if (readOnly) return avatar
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="w-full h-full">{avatar}</button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={4} className="z-50 w-52 p-1.5 bg-white rounded-xl shadow-xl border border-[#e2e8f0] max-h-64 overflow-y-auto">
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => { onChange(m.user_id); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] hover:bg-[#f1f5f9]"
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ background: AVATAR_GRAD }}>
                {getInitials(m.profile?.full_name || m.profile?.email || '?')}
              </div>
              <span className="flex-1 text-left text-[#0f172a] truncate">{m.profile?.full_name || m.profile?.email}</span>
              {uid === m.user_id && <Check className="w-3.5 h-3.5 text-[#0ea5e9]" />}
            </button>
          ))}
          {uid && (
            <button onClick={() => { onChange(null); setOpen(false) }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] text-[#94a3b8] hover:bg-[#f1f5f9]">
              <X className="w-3.5 h-3.5" /> Unassign
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

// ── Date (with overdue state) ───────────────────────────────────────────────
function DateCell({ value, onChange, readOnly }: CellProps) {
  const dateStr = typeof value === 'string' ? value : ''
  const overdue = dateStr && isBefore(parseISO(dateStr), startOfToday())
  const ref = useRef<HTMLInputElement>(null)

  if (readOnly) {
    return (
      <div className="w-full h-full flex items-center justify-center px-2 text-[12px]" style={{ color: overdue ? '#ef4444' : '#64748b' }}>
        {dateStr ? format(parseISO(dateStr), 'MMM d') : '—'}
      </div>
    )
  }
  return (
    <div className="relative w-full h-full">
      <button
        onClick={() => ref.current?.showPicker?.()}
        className="w-full h-full flex items-center justify-center gap-1 px-2 text-[12px] hover:bg-[#f8fafc]"
        style={{ color: overdue ? '#ef4444' : dateStr ? '#64748b' : '#cbd5e1' }}
      >
        {dateStr ? (
          <>
            <CalIcon className="w-3 h-3" />
            {format(parseISO(dateStr), 'MMM d')}
          </>
        ) : (
          <CalIcon className="w-3.5 h-3.5" />
        )}
      </button>
      <input
        ref={ref}
        type="date"
        value={dateStr}
        onChange={(e) => onChange(e.target.value || null)}
        className="absolute inset-0 opacity-0 pointer-events-none"
      />
    </div>
  )
}

// ── Timeline (from→to range bar) ────────────────────────────────────────────
function TimelineCell({ value, onChange, readOnly }: CellProps) {
  const range = value && typeof value === 'object' ? (value as { from: string; to: string }) : null
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(range?.from ?? '')
  const [to, setTo] = useState(range?.to ?? '')
  useEffect(() => {
    setFrom(range?.from ?? '')
    setTo(range?.to ?? '')
  }, [range?.from, range?.to])

  const bar = (
    <div className="w-full h-full flex items-center px-2">
      {range?.from && range?.to ? (
        <div className="w-full h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white px-2" style={{ background: 'linear-gradient(90deg, #0ea5e9, #6366f1)' }}>
          {format(parseISO(range.from), 'MMM d')} – {format(parseISO(range.to), 'MMM d')}
        </div>
      ) : (
        <span className="text-[#cbd5e1] text-[12px] mx-auto">—</span>
      )}
    </div>
  )
  if (readOnly) return bar
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="w-full h-full">{bar}</button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={4} className="z-50 w-60 p-3 bg-white rounded-xl shadow-xl border border-[#e2e8f0] space-y-2">
          <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">Start</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full px-2 py-1.5 text-[13px] border border-[#e2e8f0] rounded-lg outline-none focus:border-[#0ea5e9]" />
          <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">End</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full px-2 py-1.5 text-[13px] border border-[#e2e8f0] rounded-lg outline-none focus:border-[#0ea5e9]" />
          <button
            onClick={() => { onChange(from && to ? { from, to } : null); setOpen(false) }}
            className="w-full py-2 text-[13px] font-semibold text-white rounded-lg"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}
          >
            Save
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

// ── Checkbox ────────────────────────────────────────────────────────────────
function CheckboxCell({ value, onChange, readOnly }: CellProps) {
  const checked = value === true
  return (
    <div className="w-full h-full flex items-center justify-center">
      <button
        disabled={readOnly}
        onClick={() => onChange(!checked)}
        className="w-5 h-5 rounded-md flex items-center justify-center transition-all disabled:cursor-default"
        style={{ background: checked ? '#22c55e' : 'transparent', border: `2px solid ${checked ? '#22c55e' : '#cbd5e1'}` }}
      >
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </button>
    </div>
  )
}

// ── Last updated (read-only) ────────────────────────────────────────────────
function LastUpdatedCell({ item }: CellProps) {
  return (
    <div className="w-full h-full flex items-center justify-center px-2 text-[12px] text-[#94a3b8]">
      {item.updated_at ? format(parseISO(item.updated_at), 'MMM d, HH:mm') : '—'}
    </div>
  )
}

// ── Registry ────────────────────────────────────────────────────────────────
const REGISTRY: Record<BoardColumn['type'], (p: CellProps) => React.ReactNode> = {
  text: TextCell,
  number: NumberCell,
  status: StatusCell,
  priority: PriorityCell,
  person: PersonCell,
  date: DateCell,
  timeline: TimelineCell,
  checkbox: CheckboxCell,
  last_updated: LastUpdatedCell,
}

export function Cell(props: CellProps) {
  const Renderer = REGISTRY[props.column.type] ?? TextCell
  return <Renderer {...props} />
}

export { PRIORITY }
