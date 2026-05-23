import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, User, Tag, MessageSquare, Paperclip, Send } from 'lucide-react'
import type { Task } from '@/types'

interface TaskModalProps {
  task: Task
  onClose: () => void
}

export function TaskModal({ task, onClose }: TaskModalProps) {
  const [comment, setComment] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        {/* Modal */}
        <motion.div
          className="relative z-10 w-full max-w-[640px] mx-4 bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] overflow-hidden"
          initial={{ scale: 0.96, y: 10, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, y: 10, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Header */}
          <div className="flex items-start gap-4 px-6 pt-6 pb-4 border-b border-[#f1f5f9]">
            <div className="flex-1">
              <h2 className="text-[17px] font-semibold text-[#0f172a] leading-tight">
                {task.title}
              </h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[11px] px-2 py-0.5 bg-[#f0f9ff] text-[#0ea5e9] rounded-full font-medium">
                  {task.status}
                </span>
                <span className="text-[11px] px-2 py-0.5 bg-[#fffbeb] text-[#f59e0b] rounded-full font-medium">
                  {task.priority}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[#94a3b8] hover:text-[#64748b] hover:bg-[#f1f5f9] p-1.5 rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 grid grid-cols-[1fr_180px] gap-6">
            {/* Main */}
            <div>
              {/* Description */}
              <div className="mb-5">
                <h3 className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">
                  Description
                </h3>
                <p className="text-[13px] text-[#64748b] leading-relaxed">
                  {task.description || 'No description provided.'}
                </p>
              </div>

              {/* Comments */}
              <div>
                <h3 className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Comments
                </h3>

                <div className="space-y-3 mb-4">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#0ea5e9] flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
                      AL
                    </div>
                    <div className="flex-1 bg-[#f8fafc] rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12px] font-semibold text-[#0f172a]">Alex M.</span>
                        <span className="text-[11px] text-[#94a3b8]">2 hours ago</span>
                      </div>
                      <p className="text-[13px] text-[#64748b]">
                        I'll start working on this today. @Sarah can you review when done?
                      </p>
                    </div>
                  </div>
                </div>

                {/* Comment input */}
                <div className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#0ea5e9] flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0 mt-1">
                    Y
                  </div>
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Write a comment... use @ to mention"
                      rows={2}
                      className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-[13px] text-[#0f172a] placeholder-[#94a3b8] resize-none outline-none focus:border-[#0ea5e9]/50 transition-colors"
                    />
                    <button className="absolute bottom-2.5 right-2.5 text-[#0ea5e9] hover:text-[#0284c7] transition-colors">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar meta */}
            <div className="space-y-4">
              <MetaRow icon={User} label="Assignee">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#0ea5e9] flex items-center justify-center text-white text-[9px] font-semibold">
                    AL
                  </div>
                  <span className="text-[12px] text-[#0f172a]">Alex M.</span>
                </div>
              </MetaRow>

              <MetaRow icon={Clock} label="Due Date">
                <span className="text-[12px] text-[#64748b]">May 26, 2026</span>
              </MetaRow>

              <MetaRow icon={Tag} label="Labels">
                <div className="flex flex-wrap gap-1">
                  {['design', 'frontend'].map((l) => (
                    <span key={l} className="text-[10px] px-1.5 py-0.5 bg-[#f1f5f9] text-[#64748b] rounded-md">
                      {l}
                    </span>
                  ))}
                </div>
              </MetaRow>

              <MetaRow icon={Paperclip} label="Attachments">
                <span className="text-[12px] text-[#94a3b8]">No attachments</span>
              </MetaRow>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#f1f5f9] flex items-center justify-between">
            <button className="text-[12px] text-red-400 hover:text-red-500 transition-colors">
              Delete task
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-[13px] text-[#64748b] bg-white border border-[#e2e8f0] rounded-xl hover:bg-[#f1f5f9] transition-colors"
              >
                Cancel
              </button>
              <button className="px-4 py-2 text-[13px] font-medium text-white bg-[#0ea5e9] rounded-xl hover:bg-[#0284c7] transition-colors">
                Save changes
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function MetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1.5">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      {children}
    </div>
  )
}
