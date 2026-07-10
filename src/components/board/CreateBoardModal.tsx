import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { X, Loader2, Plus } from 'lucide-react'
import { useCreateBoard } from '@/lib/db/boards'
import { TEMPLATES } from '@/lib/templates'
import { notifyError, notifySuccess, errorMessage } from '@/lib/toast'

export function CreateBoardModal({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const navigate = useNavigate()
  const createBoard = useCreateBoard()
  const [name, setName] = useState('')
  const [templateKey, setTemplateKey] = useState<string | null>('project_plan')

  const submit = async () => {
    const finalName = name.trim() || (templateKey ? TEMPLATES.find((t) => t.key === templateKey)!.label : 'New Board')
    try {
      const board = await createBoard.mutateAsync({ workspaceId, name: finalName, templateKey: templateKey ?? undefined })
      notifySuccess('Board created')
      onClose()
      navigate(`/board/${board.id}`)
    } catch (e) {
      notifyError(errorMessage(e, 'Could not create board'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-[540px] bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f1f5f9]">
          <h2 className="text-[17px] font-bold text-[#0f172a]">Create a board</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f1f5f9] text-[#64748b]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest mb-2">Board name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="e.g. Q3 Roadmap"
            className="w-full px-4 py-3 text-[14px] bg-[#f8fafc] border border-[#e2e8f0] rounded-xl outline-none focus:border-[#0ea5e9] mb-5"
          />

          <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest mb-2">Start from a template</label>
          <div className="grid grid-cols-2 gap-2.5">
            <TemplateButton active={templateKey === null} onClick={() => setTemplateKey(null)} color="#64748b" label="Blank board" desc="Start from scratch" icon={<Plus className="w-3 h-3" />} />
            {TEMPLATES.map((t) => (
              <TemplateButton
                key={t.key}
                active={templateKey === t.key}
                onClick={() => setTemplateKey(t.key)}
                color={t.color}
                label={t.label}
                desc={t.description}
              />
            ))}
          </div>
        </div>

        <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#f1f5f9] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2.5 text-[13px] font-semibold text-[#64748b] rounded-xl hover:bg-[#f1f5f9]">Cancel</button>
          <button
            onClick={submit}
            disabled={createBoard.isPending}
            className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-white rounded-xl disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}
          >
            {createBoard.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create board'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function TemplateButton({ active, onClick, color, label, desc, icon }: { active: boolean; onClick: () => void; color: string; label: string; desc: string; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="text-left p-3 rounded-2xl transition-all"
      style={{ background: active ? color + '12' : '#f8fafc', border: `1px solid ${active ? color + '55' : '#eef2f6'}` }}
    >
      <div className="w-7 h-7 rounded-lg mb-2 flex items-center justify-center text-white" style={{ background: color }}>
        {icon ?? <div className="w-3 h-3 rounded-sm bg-white/70" />}
      </div>
      <p className="text-[13px] font-semibold text-[#0f172a]">{label}</p>
      <p className="text-[11px] text-[#94a3b8] leading-snug mt-0.5">{desc}</p>
    </button>
  )
}
