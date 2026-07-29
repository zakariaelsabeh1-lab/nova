import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, Loader2, Mail, Check, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { signInWithPassword, signUpWithPassword, signInWithMagicLink } from '@/lib/auth'
import { errorMessage } from '@/lib/toast'

type Mode = 'signin' | 'signup' | 'magic'

export function LoginPage() {
  const { session, loading } = useAuthStore()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [magicSent, setMagicSent] = useState(false)

  if (!loading && session) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'magic') {
        await signInWithMagicLink(email)
        setMagicSent(true)
      } else if (mode === 'signup') {
        await signUpWithPassword(email, password, fullName)
        // onAuthStateChange will redirect once the session lands
      } else {
        await signInWithPassword(email, password)
      }
    } catch (err) {
      setError(errorMessage(err, 'Authentication failed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative"
      style={{ background: 'linear-gradient(135deg, #060c18 0%, #0f172a 55%, #1e1b4b 100%)' }}
    >
      {/* ambient blobs */}
      <motion.div
        className="absolute -top-20 -right-20 w-96 h-96 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.14) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-16 -left-10 w-80 h-80 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[420px]"
      >
        {/* logo */}
        <div className="flex flex-col items-center mb-7">
          <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-xl mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0ea5e9] to-[#6366f1]" />
            <span className="absolute inset-0 flex items-center justify-center text-white font-black text-2xl">N</span>
          </div>
          <h1 className="text-white text-[22px] font-bold tracking-tight">Welcome to Nova</h1>
          <p className="text-white/40 text-[13px] mt-1">Your team's work OS</p>
        </div>

        <div
          className="rounded-3xl p-6 md:p-7 backdrop-blur-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* mode tabs */}
          <div className="flex gap-1 p-1 rounded-2xl mb-6" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {(['signin', 'signup', 'magic'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setMagicSent(false) }}
                className="relative flex-1 py-2 text-[12.5px] font-semibold rounded-xl transition-colors"
                style={{ color: mode === m ? '#fff' : 'rgba(255,255,255,0.4)' }}
              >
                {mode === m && (
                  <motion.div
                    layoutId="login-tab"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <span className="relative z-10">
                  {m === 'signin' ? 'Sign in' : m === 'signup' ? 'Sign up' : 'Magic link'}
                </span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {magicSent ? (
              <motion.div
                key="magic-sent"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-6"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#22c55e]/15 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-6 h-6 text-[#22c55e]" />
                </div>
                <p className="text-white font-semibold text-[15px] mb-1">Check your inbox</p>
                <p className="text-white/40 text-[13px]">We sent a magic link to {email}</p>
              </motion.div>
            ) : (
              <motion.form
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                onSubmit={handleSubmit}
                className="space-y-3.5"
              >
                {mode === 'signup' && (
                  <Field
                    label="Full name"
                    value={fullName}
                    onChange={setFullName}
                    placeholder="Jane Cooper"
                    type="text"
                    required
                  />
                )}
                <Field
                  label="Email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@company.com"
                  type="email"
                  required
                />
                {mode !== 'magic' && (
                  <div>
                    <label className="block text-[11px] font-bold text-white/40 uppercase tracking-widest mb-2">Password</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={8}
                        className="w-full pl-4 pr-11 py-3 text-[14px] rounded-xl outline-none text-white placeholder-white/25 transition-all"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[12px] text-red-300 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg"
                  >
                    {error}
                  </motion.p>
                )}

                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full flex items-center justify-center gap-2 py-3 text-[14px] font-semibold text-white rounded-xl transition-all disabled:opacity-60 mt-1"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', boxShadow: '0 8px 24px rgba(14,165,233,0.35)' }}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send magic link'}
                      {mode === 'magic' ? <Mail className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </>
                  )}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-5 text-white/30 text-[12px]">
          <Sparkles className="w-3.5 h-3.5" />
          Free plan includes 2 boards & 3 members
        </div>
        {/* Build stamp: makes a stale deployment immediately obvious. */}
        <div className="text-center mt-2 text-white/20 text-[10px] font-mono">
          build {typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev'} ·{' '}
          <a href="/debug" className="underline hover:text-white/40">
            diagnostics
          </a>
        </div>
      </motion.div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  type: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-white/40 uppercase tracking-widest mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3 text-[14px] rounded-xl outline-none text-white placeholder-white/25 transition-all"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
      />
    </div>
  )
}
