import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import type { Column } from '@/types'
import { useProfiles } from '@/lib/queries'

interface CreateTaskModalProps {
  boardId: string
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

export function CreateTaskModal({ boardId, columnId, columns, onClose, onCreated }: CreateTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState('')
  const [selectedColumnId, setSelectedColumnId] = useState(columnId || columns[0]?.id || '')
  const [labelsInput, setLabelsInput] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: profiles = [] } = useProfiles()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    await onCreated({
      board_id: boardId,
      column_id: selectedColumnId,
      title: title.trim(),
      description: description.trim(),
      priority,
      assignee_id: assigneeId,
      due_date: dueDate || null,
      labels: labelsInput ? labelsInput.split(',').map((l) => l.trim()).filter(Boolean) : [],
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
        className="relative z-10 w-full max-w-[500px] mx-4 bg-white rounded-2xl shadow-2xl border border-[#e2e8f0]"
        initial={{ scale: 0.96, y: 10, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f1f5f9]">
          <h2 className="text-[15px] font-semibold text-[#0f172a]">New Task</h2>
          <button onClick={onClose} className="text-[#94a3b8] hover:text-[#64748b] hover:bg-[#f1f5f9] p-1.5 rounded-lg transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              required
              autoFocus
              className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-[14px] font-medium text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#0ea5e9]/50 transition-colors"
            />
          </div>

          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={3}
              className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-[13px] text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#0ea5e9]/50 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1.5">Column</label>
              <select
                value={selectedColumnId}
                onChange={(e) => setSelectedColumnId(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-[13px] text-[#0f172a] outline-none focus:border-[#0ea5e9]/50"
              >
                {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-[13px] text-[#0f172a] outline-none focus:border-[#0ea5e9]/50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1.5">Assignee</label>
              <select
                value={assigneeId || ''}
                onChange={(e) => setAssigneeId(e.target.value || null)}
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-[13px] text-[#0f172a] outline-none focus:border-[#0ea5e9]/50"
              >
                <option value="">Unassigned</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1.5">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-[13px] text-[#0f172a] outline-none focus:border-[#0ea5e9]/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1.5">Labels (comma-separated)</label>
            <input
              type="text"
              value={labelsInput}
              onChange={(e) => setLabelsInput(e.target.value)}
              placeholder="design, frontend, bug"
              className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-[13px] text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#0ea5e9]/50 transition-colors"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-[13px] text-[#64748b] bg-[#f1f5f9] rounded-xl hover:bg-[#e2e8f0] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 py-2.5 text-[13px] font-medium text-white bg-[#0ea5e9] rounded-xl hover:bg-[#0284c7] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Task'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
