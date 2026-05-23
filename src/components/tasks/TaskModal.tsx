import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, User, Tag, MessageSquare, Send, Loader2, Trash2 } from 'lucide-react'
import type { Task, Profile } from '@/types'
import { useComments, useCreateComment, useProfiles, useUpdateTask, useDeleteTask } from '@/lib/queries'
import { useAuthStore } from '@/store/authStore'
import { formatDateTime, getInitials } from '@/lib/utils'

interface TaskModalProps {
  task: Task
  onClose: () => void
}

const priorityConfig = {
  urgent: { label: 'Urgent', color: '#ef4444', bg: '#fef2f2' },
  high: { label: 'High', color: '#f59e0b', bg: '#fffbeb' },
  medium: { label: 'Medium', color: '#0ea5e9', bg: '#f0f9ff' },
  low: { label: 'Low', color: '#94a3b8', bg: '#f8fafc' },
}

const statusConfig = {
  todo: { label: 'To Do', color: '#94a3b8' },
  in_progress: { label: 'In Progress', color: '#0ea5e9' },
  review: { label: 'Review', color: '#8b5cf6' },
  done: { label: 'Done', color: '#22c55e' },
}

export function TaskModal({ task, onClose }: TaskModalProps) {
  const { user } = useAuthStore()
  const [comment, setComment] = useState('')
  const [mentionQuery, setMentionQuery] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionIndex, setMentionIndex] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)

  const { data: comments = [], isLoading: commentsLoading } = useComments(task.id)
  const { data: profiles = [] } = useProfiles()
  const createComment = useCreateComment()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const mentionMatches = profiles.filter((p) =>
    p.full_name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 5)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMentions) setShowMentions(false)
        else onClose()
      }
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose, showMentions])

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setComment(val)

    const atIndex = val.lastIndexOf('@')
    if (atIndex !== -1 && atIndex === val.length - 1) {
      setMentionQuery('')
      setShowMentions(true)
    } else if (atIndex !== -1) {
      const query = val.slice(atIndex + 1)
      if (!query.includes(' ')) {
        setMentionQuery(query)
        setShowMentions(true)
      } else {
        setShowMentions(false)
      }
    } else {
      setShowMentions(false)
    }
  }

  const insertMention = (profile: Profile) => {
    const atIndex = comment.lastIndexOf('@')
    const newComment = comment.slice(0, atIndex) + `@${profile.full_name} `
    setComment(newComment)
    setShowMentions(false)
    inputRef.current?.focus()
  }

  const handleSendComment = async () => {
    if (!comment.trim() || !user) return
    await createComment.mutateAsync({
      task_id: task.id,
      user_id: user.id,
      content: comment.trim(),
    })
    setComment('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex((i) => Math.min(i + 1, mentionMatches.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex((i) => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && mentionMatches[mentionIndex]) { e.preventDefault(); insertMention(mentionMatches[mentionIndex]) }
      return
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendComment()
  }

  const handleDeleteTask = async () => {
    if (!confirm('Delete this task?')) return
    await deleteTask.mutateAsync({ id: task.id, boardId: task.board_id })
    onClose()
  }

  const handleSaveTitle = async () => {
    if (editTitle.trim() && editTitle !== task.title) {
      await updateTask.mutateAsync({ id: task.id, title: editTitle.trim() })
    }
    setEditing(false)
  }

  const p = priorityConfig[task.priority] || priorityConfig.medium
  const s = statusConfig[task.status] || statusConfig.todo

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />

        <motion.div
          className="relative z-10 w-full max-w-[680px] mx-4 bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] overflow-hidden max-h-[90vh] flex flex-col"
          initial={{ scale: 0.96, y: 10, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, y: 10, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Header */}
          <div className="flex items-start gap-4 px-6 pt-6 pb-4 border-b border-[#f1f5f9] flex-shrink-0">
            <div className="flex-1 min-w-0">
              {editing ? (
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  className="w-full text-[17px] font-semibold text-[#0f172a] outline-none border-b border-[#0ea5e9] pb-0.5"
                />
              ) : (
                <h2
                  className="text-[17px] font-semibold text-[#0f172a] leading-tight cursor-pointer hover:text-[#0ea5e9] transition-colors"
                  onClick={() => setEditing(true)}
                >
                  {task.title}
                </h2>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: s.color + '15', color: s.color }}>
                  {s.label}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: p.bg, color: p.color }}>
                  {p.label}
                </span>
                {task.labels?.map((l) => (
                  <span key={l} className="text-[11px] px-2 py-0.5 bg-[#f1f5f9] text-[#64748b] rounded-full">{l}</span>
                ))}
              </div>
            </div>
            <button onClick={onClose} className="text-[#94a3b8] hover:text-[#64748b] hover:bg-[#f1f5f9] p-1.5 rounded-lg transition-all flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-4 grid grid-cols-[1fr_180px] gap-6">
              {/* Main */}
              <div>
                {/* Description */}
                <div className="mb-5">
                  <h3 className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">Description</h3>
                  <p className="text-[13px] text-[#64748b] leading-relaxed">
                    {task.description || 'No description. Click to add one.'}
                  </p>
                </div>

                {/* Comments */}
                <div>
                  <h3 className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Comments {comments.length > 0 && <span className="text-[#0ea5e9]">({comments.length})</span>}
                  </h3>

                  <div className="space-y-3 mb-4 max-h-[200px] overflow-y-auto">
                    {commentsLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin text-[#94a3b8]" />
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-[12px] text-[#94a3b8]">No comments yet.</p>
                    ) : (
                      comments.map((c) => (
                        <div key={c.id} className="flex gap-3">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
                            style={{ background: '#0ea5e9' }}
                          >
                            {getInitials(c.user?.full_name || 'U')}
                          </div>
                          <div className="flex-1 bg-[#f8fafc] rounded-xl px-3 py-2.5">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[12px] font-semibold text-[#0f172a]">{c.user?.full_name || 'User'}</span>
                              <span className="text-[11px] text-[#94a3b8]">{formatDateTime(c.created_at)}</span>
                            </div>
                            <p className="text-[13px] text-[#64748b] leading-relaxed">
                              {c.content.split(/(@\w[\w\s]*)/g).map((part, i) =>
                                part.startsWith('@') ? (
                                  <span key={i} className="text-[#0ea5e9] font-medium">{part}</span>
                                ) : part
                              )}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Comment input with @ mention */}
                  <div className="flex gap-2.5 relative">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0 mt-1"
                      style={{ background: '#0ea5e9' }}
                    >
                      {user ? getInitials(user.full_name || user.email) : 'Y'}
                    </div>
                    <div className="flex-1 relative">
                      <textarea
                        ref={inputRef}
                        value={comment}
                        onChange={handleCommentChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Write a comment... use @ to mention"
                        rows={2}
                        className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-[13px] text-[#0f172a] placeholder-[#94a3b8] resize-none outline-none focus:border-[#0ea5e9]/50 transition-colors pr-10"
                      />
                      <button
                        onClick={handleSendComment}
                        disabled={!comment.trim() || createComment.isPending}
                        className="absolute bottom-2.5 right-2.5 text-[#0ea5e9] hover:text-[#0284c7] transition-colors disabled:text-[#cbd5e1]"
                      >
                        {createComment.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      </button>

                      {/* @ mention dropdown */}
                      {showMentions && mentionMatches.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute bottom-full left-0 mb-1 w-56 bg-white border border-[#e2e8f0] rounded-xl shadow-lg overflow-hidden z-10"
                        >
                          {mentionMatches.map((p, i) => (
                            <button
                              key={p.id}
                              onClick={() => insertMention(p)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#f8fafc] transition-colors ${i === mentionIndex ? 'bg-[#f0f9ff]' : ''}`}
                            >
                              <div className="w-6 h-6 rounded-full bg-[#0ea5e9] flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
                                {getInitials(p.full_name)}
                              </div>
                              <div>
                                <p className="text-[12px] font-medium text-[#0f172a]">{p.full_name}</p>
                                <p className="text-[10px] text-[#94a3b8]">{p.email}</p>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-[#94a3b8] mt-1 ml-8.5">⌘+Enter to send</p>
                </div>
              </div>

              {/* Meta sidebar */}
              <div className="space-y-4">
                <MetaRow icon={User} label="Assignee">
                  {task.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#0ea5e9] flex items-center justify-center text-white text-[9px] font-semibold">
                        {getInitials(task.assignee.full_name)}
                      </div>
                      <span className="text-[12px] text-[#0f172a]">{task.assignee.full_name}</span>
                    </div>
                  ) : (
                    <span className="text-[12px] text-[#94a3b8]">Unassigned</span>
                  )}
                </MetaRow>

                <MetaRow icon={Clock} label="Due Date">
                  <span className="text-[12px] text-[#64748b]">
                    {task.due_date
                      ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                      : 'No due date'}
                  </span>
                </MetaRow>

                <MetaRow icon={Tag} label="Labels">
                  {task.labels?.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {task.labels.map((l) => (
                        <span key={l} className="text-[10px] px-1.5 py-0.5 bg-[#f1f5f9] text-[#64748b] rounded-md">{l}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[12px] text-[#94a3b8]">No labels</span>
                  )}
                </MetaRow>

                <MetaRow icon={User} label="Created by">
                  <span className="text-[12px] text-[#64748b]">{task.creator?.full_name || 'Unknown'}</span>
                </MetaRow>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#f1f5f9] flex items-center justify-between flex-shrink-0">
            <button
              onClick={handleDeleteTask}
              className="flex items-center gap-1.5 text-[12px] text-red-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete task
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 text-[13px] text-[#64748b] bg-white border border-[#e2e8f0] rounded-xl hover:bg-[#f1f5f9] transition-colors">
                Close
              </button>
              <button
                onClick={() => updateTask.mutateAsync({ id: task.id, title: editTitle })}
                disabled={updateTask.isPending}
                className="px-4 py-2 text-[13px] font-medium text-white bg-[#0ea5e9] rounded-xl hover:bg-[#0284c7] transition-colors flex items-center gap-1.5"
              >
                {updateTask.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function MetaRow({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
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
