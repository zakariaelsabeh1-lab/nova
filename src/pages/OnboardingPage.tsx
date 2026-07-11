import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Loader2, Check, Building2, LayoutTemplate } from 'lucide-react'
import { useCreateWorkspace } from '@/lib/db/workspaces'
import { useCreateBoard } from '@/lib/db/boards'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useAuthStore } from '@/store/authStore'
import { TEMPLATES } from '@/lib/templates'
import { errorMessage, notifyError } from '@/lib/toast'

export function OnboardingPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const createWorkspace = useCreateWorkspace()
  const createBoard = useCreateBoard()
  const setWorkspace = useWorkspaceStore((s) => s.setWorkspace)

  const [step, setStep] = useState(0)
  const [wsName, setWsName] = useState(user?.full_name ? `${user.full_name.split(' ')[0]}'s Workspace` : 'My Workspace')
  const [templateKey, setTemplateKey] = useState('project_plan')
  const [busy, setBusy] = useState(false)

  const finish = async () => {
    setBusy(true)
    try {
      const ws = await createWorkspace.mutateAsync(wsName.trim() || 'My Workspace')
      setWorkspace(ws.id)
      await qc.invalidateQueries({ queryKey: ['workspaces'] })
      const board = await createBoard.mutateAsync({ workspaceId: ws.id, name: TEMPLATES.find((t) => t.key === templateKey)!.label, templateKey })
      await qc.invalidateQueries({ queryKey: ['ws-boards', ws.id] })
      // Route into the new board. RequireWorkspace now sees the workspace, so
      // this no longer bounces back to /onboarding.
      navigate(`/board/${board.id}`, { replace: true })
    } catch (e) {
      notifyError(errorMessage(e, 'Could not set up your workspace'))
      setBusy(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #060c18 0%, #0f172a 55%, #1e1b4b 100%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[560px]"
      >
        {/* progress */}
        <div className="flex items-center justify-center gap-2 mb-7">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: i === step ? 32 : 20, background: i <= step ? '#0ea5e9' : 'rgba(255,255,255,0.12)' }}
            />
          ))}
        </div>

        <div
          className="rounded-3xl p-7 md:p-9 backdrop-blur-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <AnimatePresence mode="wait">
            {step === 0 ? (
              <motion.div key="s0" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <div className="w-12 h-12 rounded-2xl bg-[#0ea5e9]/15 flex items-center justify-center mb-5">
                  <Building2 className="w-6 h-6 text-[#0ea5e9]" />
                </div>
                <h1 className="text-white text-[22px] font-bold tracking-tight mb-1.5">Name your workspace</h1>
                <p className="text-white/40 text-[14px] mb-6">This is where your team's boards live. You can change it later.</p>
                <input
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-3.5 text-[15px] rounded-xl outline-none text-white placeholder-white/25 mb-6"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  placeholder="My Workspace"
                />
                <button
                  onClick={() => setStep(1)}
                  disabled={!wsName.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 text-[14px] font-semibold text-white rounded-xl disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            ) : (
              <motion.div key="s1" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
                <div className="w-12 h-12 rounded-2xl bg-[#8b5cf6]/15 flex items-center justify-center mb-5">
                  <LayoutTemplate className="w-6 h-6 text-[#8b5cf6]" />
                </div>
                <h1 className="text-white text-[22px] font-bold tracking-tight mb-1.5">Pick a starting template</h1>
                <p className="text-white/40 text-[14px] mb-6">We'll create your first board with sample data.</p>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setTemplateKey(t.key)}
                      className="relative text-left p-4 rounded-2xl transition-all"
                      style={{
                        background: templateKey === t.key ? `${t.color}18` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${templateKey === t.key ? t.color + '66' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      {templateKey === t.key && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: t.color }}>
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className="w-8 h-8 rounded-lg mb-3 flex items-center justify-center" style={{ background: t.color + '22' }}>
                        <div className="w-3 h-3 rounded-sm" style={{ background: t.color }} />
                      </div>
                      <p className="text-white text-[13.5px] font-semibold">{t.label}</p>
                      <p className="text-white/35 text-[11.5px] mt-0.5 leading-snug">{t.description}</p>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(0)}
                    className="px-5 py-3 text-[14px] font-semibold text-white/60 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    Back
                  </button>
                  <button
                    onClick={finish}
                    disabled={busy}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-[14px] font-semibold text-white rounded-xl disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create workspace <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
