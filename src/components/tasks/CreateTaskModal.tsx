import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import type { Column, BoardType } from '@/types'

interface CreateTaskModalProps {
  boardId: string
  boardType?: BoardType
  columnId: string | undefined
  columns: Column[]
  onClose: () => void
  onCreated: (data: {
    board_id: string
    column_id: string
    title: string
    description: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    assignee_id: string | null
    due_date: string | null
    labels: string[]
    position: number
    status: 'todo'
  }) => Promise<void>
}

const inputCls = 'w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-[13px] text-[#0f172a] outline-none focus:border-[#0ea5e9]/50 transition-colors'
const labelCls = 'block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1.5'

function calcDays(from: string, to: string): number {
  if (!from || !to) return 0
  const d = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000)
  return Math.max(0, d + 1)
}

export function CreateTaskModal({ boardId, boardType, columnId, columns, onClose, onCreated }: CreateTaskModalProps) {
  const [saving, setSaving] = useState(false)
  const [selectedColumnId, setSelectedColumnId] = useState(columnId || columns[0]?.id || '')

  // Generic fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [dueDate, setDueDate] = useState('')
  const [labelsInput, setLabelsInput] = useState('')

  // Vacation fields
  const [vStaff, setVStaff] = useState('')
  const [vLeaveType, setVLeaveType] = useState('Vacation')
  const [vDateFrom, setVDateFrom] = useState('')
  const [vDateTo, setVDateTo] = useState('')

  // Assignment fields
  const [aStaff, setAStaff] = useState('')
  const [aStartDate, setAStartDate] = useState('')
  const [aEndDate, setAEndDate] = useState('')
  const [aLocation, setALocation] = useState('')
  const [aNotes, setANotes] = useState('')

  // Projects fields
  const [pTitle, setPTitle] = useState('')
  const [pDescription, setPDescription] = useState('')
  const [pPriority, setPPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [pDueDate, setPDueDate] = useState('')

  const vacDays = useMemo(() => calcDays(vDateFrom, vDateTo), [vDateFrom, vDateTo])

  const modalTitles: Record<string, string> = {
    tasks: 'New Task', projects: 'New Project', assignments: 'New Assignment', vacation: 'New Vacation Request',
  }
  const submitLabels: Record<string, string> = {
    tasks: 'Create Task', projects: 'Create Project', assignments: 'Create Assignment', vacation: 'Submit Request',
  }
  const modalTitle = boardType ? (modalTitles[boardType] || 'New Task') : 'New Task'
  const submitLabel = boardType ? (submitLabels[boardType] || 'Create Task') : 'Create Task'

  const isValid = () => {
    if (boardType === 'vacation') return vStaff.trim() && vDateFrom && vDateTo
    if (boardType === 'assignments') return aStaff.trim()
    if (boardType === 'projects') return pTitle.trim()
    return title.trim()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid()) return
    setSaving(true)

    let finalTitle = title.trim()
    let finalDesc = description.trim()
    let finalDue: string | null = dueDate || null
    let finalLabels: string[] = labelsInput ? labelsInput.split(',').map((l) => l.trim()).filter(Boolean) : []
    let finalPriority = priority

    if (boardType === 'vacation') {
      finalTitle = `${vStaff.trim()} — ${vLeaveType}`
      finalDesc = ''
      finalDue = vDateFrom || null
      finalLabels = [
        `staff:${vStaff.trim()}`,
        `leave_type:${vLeaveType}`,
        `date_from:${vDateFrom}`,
        `date_to:${vDateTo}`,
        `total_days:${vacDays}`,
      ]
      finalPriority = 'medium'
    } else if (boardType === 'assignments') {
      finalTitle = aStaff.trim()
      finalDesc = aNotes.trim()
      finalDue = aStartDate || null
      finalLabels = [
        `staff:${aStaff.trim()}`,
        ...(aStartDate ? [`start_date:${aStartDate}`] : []),
        ...(aEndDate ? [`end_date:${aEndDate}`] : []),
        ...(aLocation.trim() ? [`location:${aLocation.trim()}`] : []),
      ]
      finalPriority = 'medium'
    } else if (boardType === 'projects') {
      finalTitle = pTitle.trim()
      finalDesc = pDescription.trim()
      finalDue = pDueDate || null
      finalPriority = pPriority
    }

    await onCreated({
      board_id: boardId,
      column_id: selectedColumnId,
      title: finalTitle,
      description: finalDesc,
      priority: finalPriority,
      assignee_id: null,
      due_date: finalDue,
      labels: finalLabels,
      position: 0,
      status: 'todo',
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        className="absolute inset-0 bg-black/25 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        className="relative z-10 w-full max-w-[520px] mx-4 bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] overflow-hidden"
        initial={{ scale: 0.96, y: 10, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f1f5f9]">
          <h2 className="text-[15px] font-semibold text-[#0f172a]">{modalTitle}</h2>
          <button onClick={onClose} className="text-[#94a3b8] hover:text-[#64748b] hover:bg-[#f1f5f9] p-1.5 rounded-lg transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* ── VACATION ── */}
          {boardType === 'vacation' && (<>
            <div>
              <label className={labelCls}>Staff Member</label>
              <input type="text" value={vStaff} onChange={(e) => setVStaff(e.target.value)}
                placeholder="Full name" required autoFocus className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Leave Type</label>
              <select value={vLeaveType} onChange={(e) => setVLeaveType(e.target.value)} className={inputCls}>
                <option>Vacation</option>
                <option>Sick</option>
                <option>Personal</option>
                <option>Other</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Date From</label>
                <input type="date" value={vDateFrom} onChange={(e) => setVDateFrom(e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Date To</label>
                <input type="date" value={vDateTo} onChange={(e) => setVDateTo(e.target.value)} required min={vDateFrom} className={inputCls} />
              </div>
            </div>
            {vacDays > 0 && (
              <div className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[#0ea5e9]"
                style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)' }}>
                {vacDays} day{vacDays !== 1 ? 's' : ''} total
              </div>
            )}
            <div>
              <label className={labelCls}>Status</label>
              <select value={selectedColumnId} onChange={(e) => setSelectedColumnId(e.target.value)} className={inputCls}>
                {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </>)}

          {/* ── ASSIGNMENTS ── */}
          {boardType === 'assignments' && (<>
            <div>
              <label className={labelCls}>Staff Member</label>
              <input type="text" value={aStaff} onChange={(e) => setAStaff(e.target.value)}
                placeholder="Full name" required autoFocus className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Start Date</label>
                <input type="date" value={aStartDate} onChange={(e) => setAStartDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>End Date</label>
                <input type="date" value={aEndDate} onChange={(e) => setAEndDate(e.target.value)} min={aStartDate} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Location</label>
              <input type="text" value={aLocation} onChange={(e) => setALocation(e.target.value)}
                placeholder="Office, remote, site..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Notes</label>
              <textarea value={aNotes} onChange={(e) => setANotes(e.target.value)}
                placeholder="Additional notes..." rows={3}
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-[13px] text-[#0f172a] outline-none focus:border-[#0ea5e9]/50 transition-colors resize-none" />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={selectedColumnId} onChange={(e) => setSelectedColumnId(e.target.value)} className={inputCls}>
                {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </>)}

          {/* ── PROJECTS ── */}
          {boardType === 'projects' && (<>
            <div>
              <input type="text" value={pTitle} onChange={(e) => setPTitle(e.target.value)}
                placeholder="Project name" required autoFocus
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-[14px] font-medium text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#0ea5e9]/50 transition-colors" />
            </div>
            <div>
              <textarea value={pDescription} onChange={(e) => setPDescription(e.target.value)}
                placeholder="Description (optional)" rows={3}
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-[13px] text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#0ea5e9]/50 transition-colors resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Phase</label>
                <select value={selectedColumnId} onChange={(e) => setSelectedColumnId(e.target.value)} className={inputCls}>
                  {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Priority</label>
                <select value={pPriority} onChange={(e) => setPPriority(e.target.value as typeof pPriority)} className={inputCls}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Due Date</label>
              <input type="date" value={pDueDate} onChange={(e) => setPDueDate(e.target.value)} className={inputCls} />
            </div>
          </>)}

          {/* ── TASKS (default) ── */}
          {(!boardType || boardType === 'tasks') && (<>
            <div>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title" required autoFocus
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-[14px] font-medium text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#0ea5e9]/50 transition-colors" />
            </div>
            <div>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)" rows={3}
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-[13px] text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#0ea5e9]/50 transition-colors resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Column</label>
                <select value={selectedColumnId} onChange={(e) => setSelectedColumnId(e.target.value)} className={inputCls}>
                  {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className={inputCls}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Labels (comma-separated)</label>
              <input type="text" value={labelsInput} onChange={(e) => setLabelsInput(e.target.value)}
                placeholder="design, frontend, bug" className={inputCls} />
            </div>
          </>)}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-[13px] text-[#64748b] bg-[#f1f5f9] rounded-xl hover:bg-[#e2e8f0] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving || !isValid()}
              className="flex-1 py-2.5 text-[13px] font-medium text-white bg-[#0ea5e9] rounded-xl hover:bg-[#0284c7] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : submitLabel}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
