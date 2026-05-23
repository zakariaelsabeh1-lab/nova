import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock, User, Tag, MessageSquare, Send, Loader2, Trash2, Edit2, CheckCircle2 } from 'lucide-react'
import type { Task, Profile } from '@/types'
import { useComments, useCreateComment, useProfiles, useUpdateTask, useDeleteTask } from '@/lib/queries'
import { useAuthStore } from '@/store/authStore'
import { formatDateTime, getInitials, isDemoUser } from '@/lib/utils'

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

const avatarColors = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#22c55e', '#ef4444', '#ec4899']

export function TaskModal({ task, onClose }: TaskModalProps) {
  const { user } = useAuthStore()
  const [comment, setComment] = useState('')
  const [mentionQuery, setMentionQuery] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionIndex, setMentionIndex] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editingDesc, setEditingDesc] = useState(false)
  const [editDesc, setEditDesc] = useState(task.description || '')

  const { data: comments = [], isLoading: commentsLoading } = useComments(task.id)
  const { data: profiles = [] } = useProfiles()
  const createComment = useCreateComment()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const mentionMatches = profiles
    .filter(
      (p) =>
        p.full_name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(mentionQuery.toLowerCase())
    )
    .slice(0, 5)

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

  useEffect(() => {
    if (comments.length > 0) {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [comments.length])

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setComment(val)
    const atIndex = val.lastIndexOf('@')
    if (atIndex !== -1) {
      const query = val.slice(atIndex + 1)
      if (!query.includes(' ')) {
        setMentionQuery(query)
        setShowMentions(true)
        return
      }
    }
    setShowMentions(false)
  }

  const insertMention = (profile: Profile) => {
    const atIndex = comment.lastIndexOf('@')
    setComment(comment.slice(0, atIndex) + `@${profile.full_name} `)
    setShowMentions(false)
    inputRef.current?.focus()
  }

  const handleSendComment = async () => {
    if (!comment.trim() || !user) return
    await createComment.mutateAsync({ task_id: task.id, user_id: user.id, content: comment.trim() })
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
    setEditingTitle(false)
  }

  const handleSaveDesc = async () => {
    await updateTask.mutateAsync({ id: task.id, description: editDesc.trim() })
    setEditingDesc(false)
  }

  const isDemo = isDemoUser(user)
  const p = priorityConfig[task.priority] || priorityConfig.medium
  const s = statusConfig[task.status] || statusConfig.todo
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-md"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />

        <motion.div
          className="relative z-10 w-full max-w-[780px] bg-white rounded-3xl shadow-[0_32px_64px_-16px_rgba(15,23,42,0.25)] border border-[#e2e8f0] overflow-hidden max-h-[90vh] flex flex-col"
          initial={{ scale: 0.95, y: 16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 16, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Top accent strip */}
          <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${p.color}, ${p.color}40)` }} />

          {/* Header */}
          <div className="px-7 pt-6 pb-5 border-b border-[#f1f5f9] flex-shrink-0">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                {editingTitle ? (
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                    className="w-full text-[20px] font-bold text-[#0f172a] outline-none border-b-2 border-[#0ea5e9] pb-1 bg-transparent"
                  />
                ) : (
                  <div className="flex items-start gap-2 group">
                    <h2
                      className="text-[20px] font-bold text-[#0f172a] leading-tight cursor-text hover:text-[#0ea5e9] transition-colors flex-1"
                      onClick={() => setEditingTitle(true)}
                    >
                      {editTitle}
                    </h2>
                    <button
                      onClick={() => setEditingTitle(true)}
                      className="opacity-0 group-hover:opacity-100 mt-1 text-[#94a3b8] hover:text-[#64748b] transition-all flex-shrink-0"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold"
                    style={{ background: s.color + '15', color: s.color }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span
                    className="inline-flex items-center text-[11px] px-2.5 py-1 rounded-full font-semibold"
                    style={{ background: p.bg, color: p.color }}
                  >
                    {p.label}
                  </span>
                  {task.labels?.map((l) => (
                    <span key={l} className="text-[11px] px-2.5 py-1 bg-[#f1f5f9] text-[#64748b] rounded-full font-medium">{l}</span>
                  ))}
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-[#94a3b8] hover:text-[#64748b] hover:bg-[#f1f5f9] rounded-xl transition-all flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-[1fr_220px] divide-x divide-[#f1f5f9]">
              {/* Main content */}
              <div className="px-7 py-6 space-y-6">
                {/* Description */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest">Description</h3>
                    {!editingDesc && (
                      <button
                        onClick={() => setEditingDesc(true)}
                        className="text-[11px] text-[#94a3b8] hover:text-[#64748b] flex items-center gap-1 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </button>
                    )}
                  </div>
                  {editingDesc ? (
                    <div className="space-y-2">
                      <textarea
                        autoFocus
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        rows={4}
                        className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-[13px] text-[#0f172a] resize-none outline-none focus:border-[#0ea5e9]/50 transition-colors"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveDesc}
                          className="px-3 py-1.5 text-[12px] font-medium text-white bg-[#0ea5e9] rounded-lg hover:bg-[#0284c7] transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => { setEditingDesc(false); setEditDesc(task.description || '') }}
                          className="px-3 py-1.5 text-[12px] text-[#64748b] bg-[#f1f5f9] rounded-lg hover:bg-[#e2e8f0] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      className={`text-[13px] leading-relaxed cursor-text rounded-xl px-1 py-0.5 -mx-1 hover:bg-[#f8fafc] transition-colors ${editDesc ? 'text-[#0f172a]' : 'text-[#94a3b8]'}`}
                      onClick={() => setEditingDesc(true)}
                    >
                      {task.description || 'Click to add a description...'}
                    </p>
                  )}
                </div>

                {/* Comments */}
                <div>
                  <h3 className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Activity
                    {comments.length > 0 && (
                      <span className="text-[#0ea5e9] font-semibold">· {comments.length}</span>
                    )}
                  </h3>

                  {commentsLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-4 h-4 animate-spin text-[#94a3b8]" />
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-6">
                      <MessageSquare className="w-8 h-8 text-[#e2e8f0] mx-auto mb-2" />
                      <p className="text-[12px] text-[#94a3b8]">No comments yet. Start the conversation.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 mb-4 max-h-[240px] overflow-y-auto pr-1">
                      {comments.map((c, i) => (
                        <motion.div
                          key={c.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex gap-3"
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mt-0.5"
                            style={{ background: avatarColors[i % avatarColors.length] }}
                          >
                            {getInitials(c.user?.full_name || 'U')}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[12px] font-semibold text-[#0f172a]">{c.user?.full_name || 'User'}</span>
                              <span className="text-[10px] text-[#94a3b8]">{formatDateTime(c.created_at)}</span>
                            </div>
                            <div className="bg-[#f8fafc] border border-[#f1f5f9] rounded-2xl rounded-tl-sm px-4 py-3">
                              <p className="text-[13px] text-[#374151] leading-relaxed">
                                {c.content.split(/(@\w[\w\s]*)/g).map((part, i) =>
                                  part.startsWith('@') ? (
                                    <span key={i} className="text-[#0ea5e9] font-semibold bg-sky-50 px-1 rounded">{part}</span>
                                  ) : (
                                    part
                                  )
                                )}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      <div ref={commentsEndRef} />
                    </div>
                  )}

                  {/* Comment input */}
                  <div className="flex gap-3 relative">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mt-1"
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
                        className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl px-4 py-3 text-[13px] text-[#0f172a] placeholder-[#94a3b8] resize-none outline-none focus:border-[#0ea5e9]/50 focus:bg-white transition-all pr-12"
                      />
                      <button
                        onClick={handleSendComment}
                        disabled={!comment.trim() || createComment.isPending}
                        className="absolute bottom-3 right-3 w-7 h-7 bg-[#0ea5e9] rounded-lg flex items-center justify-center text-white hover:bg-[#0284c7] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {createComment.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {showMentions && mentionMatches.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute bottom-full left-0 mb-2 w-60 bg-white border border-[#e2e8f0] rounded-2xl shadow-xl overflow-hidden z-20"
                        >
                          {mentionMatches.map((mp, i) => (
                            <button
                              key={mp.id}
                              onClick={() => insertMention(mp)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#f8fafc] transition-colors ${i === mentionIndex ? 'bg-[#f0f9ff]' : ''}`}
                            >
                              <div className="w-7 h-7 rounded-full bg-[#0ea5e9] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                {getInitials(mp.full_name)}
                              </div>
                              <div>
                                <p className="text-[13px] font-semibold text-[#0f172a]">{mp.full_name}</p>
                                <p className="text-[11px] text-[#94a3b8]">{mp.email}</p>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-[#94a3b8] mt-1.5 ml-10">Press ⌘+Enter to send</p>
                </div>
              </div>

              {/* Meta sidebar */}
              <div className="px-6 py-6 space-y-5 bg-[#fafafa]">
                <MetaItem icon={User} label="Assignee">
                  {task.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#0ea5e9] flex items-center justify-center text-white text-[10px] font-bold">
                        {getInitials(task.assignee.full_name)}
                      </div>
                      <span className="text-[12px] font-medium text-[#0f172a] truncate">{task.assignee.full_name}</span>
                    </div>
                  ) : (
                    <span className="text-[12px] text-[#94a3b8]">Unassigned</span>
                  )}
                </MetaItem>

                <MetaItem icon={Clock} label="Due Date">
                  <span className={`text-[12px] font-medium ${isOverdue ? 'text-red-500' : 'text-[#0f172a]'}`}>
                    {task.due_date
                      ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : <span className="text-[#94a3b8] font-normal">Not set</span>}
                  </span>
                  {isOverdue && (
                    <span className="text-[10px] text-red-400 mt-0.5 block">Overdue</span>
                  )}
                </MetaItem>

                <MetaItem icon={Tag} label="Labels">
                  {task.labels?.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {task.labels.map((l) => (
                        <span key={l} className="text-[10px] px-2 py-0.5 bg-[#f1f5f9] text-[#64748b] rounded-md font-medium">{l}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[12px] text-[#94a3b8]">No labels</span>
                  )}
                </MetaItem>

                <MetaItem icon={CheckCircle2} label="Status">
                  <span
                    className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                    style={{ background: s.color + '15', color: s.color }}
                  >
                    {s.label}
                  </span>
                </MetaItem>

                <MetaItem icon={User} label="Created by">
                  <span className="text-[12px] text-[#64748b]">{task.creator?.full_name || 'Unknown'}</span>
                </MetaItem>

                {!isDemo && (
                  <div className="pt-4 border-t border-[#f1f5f9]">
                    <button
                      onClick={handleDeleteTask}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-[12px] text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete task
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-7 py-4 bg-[#f8fafc] border-t border-[#f1f5f9] flex items-center justify-end gap-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[13px] text-[#64748b] bg-white border border-[#e2e8f0] rounded-xl hover:bg-[#f1f5f9] transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => updateTask.mutateAsync({ id: task.id, title: editTitle, description: editDesc })}
              disabled={updateTask.isPending}
              className="px-5 py-2 text-[13px] font-semibold text-white bg-[#0f172a] rounded-xl hover:bg-[#1e293b] transition-colors flex items-center gap-1.5 disabled:opacity-60"
            >
              {updateTask.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Save changes
              </>}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function MetaItem({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1.5">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      {children}
    </div>
  )
}
