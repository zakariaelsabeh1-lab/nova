import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, MessageSquare, Activity as ActivityIcon, Paperclip, LayoutList, Send, Trash2, Upload, FileText, Loader2, CornerDownRight,
} from 'lucide-react'
import type { BoardColumn, ItemWithCells, WorkspaceMember, CellValue, Update } from '@/types'
import { Cell } from './cells'
import { useUpdates, useCreateUpdate, useDeleteUpdate, useItemFiles, useUploadFile, useDeleteFile } from '@/lib/db/collab'
import { useItemActivity, formatActivityValue } from '@/lib/db/activity'
import { useAuthStore } from '@/store/authStore'
import { getInitials, formatDateTime } from '@/lib/utils'

type Tab = 'details' | 'updates' | 'activity' | 'files'

export function ItemPanel({
  item,
  boardId,
  workspaceId,
  columns,
  members,
  readOnly,
  onClose,
  onSetCell,
  onRename,
}: {
  item: ItemWithCells
  boardId: string
  workspaceId: string | null
  columns: BoardColumn[]
  members: WorkspaceMember[]
  readOnly: boolean
  onClose: () => void
  onSetCell: (itemId: string, columnId: string, value: CellValue, column: BoardColumn, old: CellValue) => void
  onRename: (name: string) => void
}) {
  const [tab, setTab] = useState<Tab>('updates')
  const [name, setName] = useState(item.name)

  const tabs = [
    { id: 'details' as Tab, label: 'Details', icon: LayoutList },
    { id: 'updates' as Tab, label: 'Updates', icon: MessageSquare },
    { id: 'activity' as Tab, label: 'Activity', icon: ActivityIcon },
    { id: 'files' as Tab, label: 'Files', icon: Paperclip },
  ]

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
        {/* header */}
        <div className="px-5 pt-5 pb-3 border-b border-[#e2e8f0] flex-shrink-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <input
              value={name}
              disabled={readOnly}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name !== item.name && onRename(name)}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="flex-1 text-[19px] font-bold text-[#0f172a] outline-none disabled:cursor-default"
            />
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f1f5f9] text-[#64748b] flex-shrink-0">
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
          <div className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="relative flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold rounded-lg transition-colors"
                style={{ color: tab === t.id ? '#0f172a' : '#94a3b8' }}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
                {tab === t.id && <motion.div layoutId="item-tab" className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[#0ea5e9]" />}
              </button>
            ))}
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {tab === 'details' && <DetailsTab key="d" item={item} columns={columns} members={members} readOnly={readOnly} onSetCell={onSetCell} />}
            {tab === 'updates' && <UpdatesTab key="u" itemId={item.id} boardId={boardId} members={members} readOnly={readOnly} />}
            {tab === 'activity' && <ActivityTab key="a" itemId={item.id} />}
            {tab === 'files' && <FilesTab key="f" itemId={item.id} workspaceId={workspaceId} readOnly={readOnly} />}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

function TabWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="p-5">
      {children}
    </motion.div>
  )
}

// ── Details ─────────────────────────────────────────────────────────────────
function DetailsTab({
  item,
  columns,
  members,
  readOnly,
  onSetCell,
}: {
  item: ItemWithCells
  columns: BoardColumn[]
  members: WorkspaceMember[]
  readOnly: boolean
  onSetCell: (itemId: string, columnId: string, value: CellValue, column: BoardColumn, old: CellValue) => void
}) {
  return (
    <TabWrap>
      <div className="space-y-1">
        {[...columns].sort((a, b) => a.position - b.position).map((col) => (
          <div key={col.id} className="flex items-center gap-3 py-2 border-b border-[#f1f5f9]">
            <span className="text-[12px] font-semibold text-[#94a3b8] w-28 flex-shrink-0">{col.name}</span>
            <div className="flex-1 h-9 rounded-lg border border-[#f1f5f9] overflow-hidden">
              <Cell column={col} item={item} members={members} value={item.cells[col.id] ?? null} readOnly={readOnly} onChange={(v) => onSetCell(item.id, col.id, v, col, item.cells[col.id] ?? null)} />
            </div>
          </div>
        ))}
      </div>
    </TabWrap>
  )
}

// ── Updates (threaded + @mentions) ──────────────────────────────────────────
function UpdatesTab({ itemId, boardId, members, readOnly }: { itemId: string; boardId: string; members: WorkspaceMember[]; readOnly: boolean }) {
  const { data: updates = [], isLoading } = useUpdates(itemId)
  const create = useCreateUpdate(itemId, boardId)
  const del = useDeleteUpdate(itemId)
  const [replyTo, setReplyTo] = useState<string | null>(null)

  return (
    <TabWrap>
      {!readOnly && <Composer members={members} onSubmit={(body, mentions) => create.mutate({ body, mentions })} />}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#cbd5e1]" /></div>
      ) : updates.length === 0 ? (
        <p className="text-center text-[13px] text-[#94a3b8] py-8">No updates yet. Start the conversation.</p>
      ) : (
        <div className="space-y-4 mt-4">
          {updates.map((u) => (
            <UpdateBlock key={u.id} update={u} members={members} readOnly={readOnly} onReply={setReplyTo} replyOpen={replyTo === u.id} onDelete={(id) => del.mutate(id)} onSubmitReply={(body, mentions) => { create.mutate({ body, parentId: u.id, mentions }); setReplyTo(null) }} />
          ))}
        </div>
      )}
    </TabWrap>
  )
}

function UpdateBlock({
  update,
  members,
  readOnly,
  onReply,
  replyOpen,
  onSubmitReply,
  onDelete,
}: {
  update: Update
  members: WorkspaceMember[]
  readOnly: boolean
  onReply: (id: string | null) => void
  replyOpen: boolean
  onSubmitReply: (body: string, mentions: string[]) => void
  onDelete: (id: string) => void
}) {
  const me = useAuthStore((s) => s.user?.id)
  return (
    <div className="rounded-xl border border-[#f1f5f9] p-3">
      <UpdateRow update={update} canDelete={update.user_id === me} onDelete={onDelete} />
      {update.replies && update.replies.length > 0 && (
        <div className="mt-2 pl-4 border-l-2 border-[#f1f5f9] space-y-2">
          {update.replies.map((r) => (
            <UpdateRow key={r.id} update={r} canDelete={r.user_id === me} onDelete={onDelete} />
          ))}
        </div>
      )}
      {!readOnly && (
        <div className="mt-2 pl-4">
          {replyOpen ? (
            <Composer members={members} compact autoFocus onSubmit={onSubmitReply} onCancel={() => onReply(null)} />
          ) : (
            <button onClick={() => onReply(update.id)} className="flex items-center gap-1 text-[12px] font-semibold text-[#94a3b8] hover:text-[#0ea5e9]">
              <CornerDownRight className="w-3 h-3" /> Reply
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function UpdateRow({ update, canDelete, onDelete }: { update: Update; canDelete: boolean; onDelete: (id: string) => void }) {
  return (
    <div className="flex gap-2.5 group">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}>
        {getInitials(update.user?.full_name || update.user?.email || '?')}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-[#0f172a]">{update.user?.full_name || 'User'}</span>
          <span className="text-[11px] text-[#cbd5e1]">{formatDateTime(update.created_at)}</span>
          {canDelete && (
            <button onClick={() => onDelete(update.id)} className="opacity-0 group-hover:opacity-100 text-[#cbd5e1] hover:text-[#ef4444] ml-auto">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
        <p className="text-[13px] text-[#334155] mt-0.5 whitespace-pre-wrap break-words">{renderMentions(update.body)}</p>
      </div>
    </div>
  )
}

function renderMentions(body: string) {
  return body.split(/(@\w+)/g).map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="text-[#0ea5e9] font-semibold">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

function Composer({
  members,
  onSubmit,
  onCancel,
  compact,
  autoFocus,
}: {
  members: WorkspaceMember[]
  onSubmit: (body: string, mentions: string[]) => void
  onCancel?: () => void
  compact?: boolean
  autoFocus?: boolean
}) {
  const [body, setBody] = useState('')

  const submit = () => {
    if (!body.trim()) return
    // resolve @firstname tokens to member ids
    const mentions: string[] = []
    const tokens = body.match(/@(\w+)/g) ?? []
    for (const t of tokens) {
      const name = t.slice(1).toLowerCase()
      const m = members.find((mm) => (mm.profile?.full_name || '').toLowerCase().split(' ')[0] === name)
      if (m) mentions.push(m.user_id)
    }
    onSubmit(body.trim(), mentions)
    setBody('')
  }

  return (
    <div className={compact ? '' : 'mb-2'}>
      <textarea
        autoFocus={autoFocus}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
        placeholder="Write an update…  use @name to mention"
        rows={compact ? 2 : 3}
        className="w-full px-3 py-2 text-[13px] rounded-xl border border-[#e2e8f0] outline-none focus:border-[#0ea5e9] resize-none"
      />
      <div className="flex items-center justify-end gap-2 mt-1.5">
        {onCancel && (
          <button onClick={onCancel} className="px-3 py-1.5 text-[12px] font-semibold text-[#64748b] rounded-lg hover:bg-[#f1f5f9]">Cancel</button>
        )}
        <button onClick={submit} disabled={!body.trim()} className="flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-semibold text-white rounded-lg disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}>
          <Send className="w-3 h-3" /> Post
        </button>
      </div>
    </div>
  )
}

// ── Activity ────────────────────────────────────────────────────────────────
function ActivityTab({ itemId }: { itemId: string }) {
  const { data: activity = [], isLoading } = useItemActivity(itemId)
  return (
    <TabWrap>
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#cbd5e1]" /></div>
      ) : activity.length === 0 ? (
        <p className="text-center text-[13px] text-[#94a3b8] py-8">No activity recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {activity.map((a) => (
            <div key={a.id} className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}>
                {getInitials(a.user?.full_name || a.user?.email || '?')}
              </div>
              <div className="flex-1 text-[12.5px]">
                <p className="text-[#334155]">
                  <span className="font-semibold text-[#0f172a]">{a.user?.full_name || 'Someone'}</span>{' '}
                  {a.action}
                  {a.field && <> <span className="text-[#94a3b8]">{a.field}</span></>}
                  {a.action === 'updated' && a.field && (
                    <> from <span className="font-medium">{formatActivityValue(a.old_value)}</span> to <span className="font-medium">{formatActivityValue(a.new_value)}</span></>
                  )}
                </p>
                <span className="text-[11px] text-[#cbd5e1]">{formatDateTime(a.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </TabWrap>
  )
}

// ── Files ───────────────────────────────────────────────────────────────────
function FilesTab({ itemId, workspaceId, readOnly }: { itemId: string; workspaceId: string | null; readOnly: boolean }) {
  const { data: files = [], isLoading } = useItemFiles(itemId)
  const upload = useUploadFile(itemId, workspaceId ?? '')
  const del = useDeleteFile(itemId)

  return (
    <TabWrap>
      {!readOnly && workspaceId && (
        <label className="flex items-center justify-center gap-2 py-6 border-2 border-dashed border-[#e2e8f0] rounded-xl cursor-pointer hover:border-[#0ea5e9]/50 hover:bg-[#f8fafc] transition-colors mb-4">
          {upload.isPending ? <Loader2 className="w-4 h-4 animate-spin text-[#0ea5e9]" /> : <Upload className="w-4 h-4 text-[#94a3b8]" />}
          <span className="text-[13px] font-semibold text-[#64748b]">{upload.isPending ? 'Uploading…' : 'Upload a file'}</span>
          <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = '' }} />
        </label>
      )}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#cbd5e1]" /></div>
      ) : files.length === 0 ? (
        <p className="text-center text-[13px] text-[#94a3b8] py-6">No files attached.</p>
      ) : (
        <div className="space-y-2">
          {files.map((f) => {
            const isImage = f.mime?.startsWith('image/')
            return (
              <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-[#f1f5f9] group">
                {isImage ? (
                  <img src={f.url} alt={f.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[#f1f5f9] flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-[#94a3b8]" />
                  </div>
                )}
                <a href={f.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#0f172a] truncate hover:text-[#0ea5e9]">{f.name}</p>
                  <p className="text-[11px] text-[#94a3b8]">{(f.size_bytes / 1024).toFixed(0)} KB</p>
                </a>
                {!readOnly && (
                  <button onClick={() => del.mutate(f)} className="opacity-0 group-hover:opacity-100 text-[#cbd5e1] hover:text-[#ef4444]">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </TabWrap>
  )
}
