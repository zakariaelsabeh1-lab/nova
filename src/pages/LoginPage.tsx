import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const { user, loading, fetchProfile, setLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Already authenticated — redirect immediately
  if (!loading && user) return <Navigate to="/" replace />

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    setLoading(true) // prevent ProtectedRoute from redirecting during fetch

    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })

    if (err) {
      setError(err.message)
      setSubmitting(false)
      setLoading(false)
      return
    }

    if (data.user) {
      // Fetch profile FIRST, then navigate — so ProtectedRoute sees the user
      await fetchProfile(data.user.id)
    }

    setLoading(false)
    navigate('/', { replace: true })
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #060c18 0%, #0f172a 60%, #1e1b4b 100%)' }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative w-10 h-10 rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0ea5e9] to-[#6366f1]" />
            <span className="absolute inset-0 flex items-center justify-center text-white font-black text-lg">N</span>
          </div>
          <div className="w-5 h-5 rounded-full border-2 border-[#0ea5e9] border-t-transparent animate-spin" />
        </motion.div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center overflow-hidden relative"
      style={{ background: 'linear-gradient(135deg, #060c18 0%, #0f172a 40%, #1e1b4b 70%, #0f172a 100%)' }}
    >
      {/* Animated background orbs */}
      <motion.div
        className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.09) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      {/* Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      {/* Floating particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: [3, 5, 4, 6, 3, 4, 5, 3][i],
            height: [3, 5, 4, 6, 3, 4, 5, 3][i],
            background: ['#0ea5e9', '#6366f1', '#22c55e', '#0ea5e9', '#6366f1', '#f59e0b', '#0ea5e9', '#6366f1'][i],
            opacity: 0.35,
            left: `${[12, 78, 38, 88, 22, 62, 48, 90][i]}%`,
            top: `${[18, 12, 72, 42, 88, 28, 55, 65][i]}%`,
          }}
          animate={{ y: [-10, 10, -10], opacity: [0.15, 0.45, 0.15] }}
          transition={{ duration: 4 + i * 0.7, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[400px] mx-4"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-center mb-9"
        >
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-2xl overflow-hidden shadow-2xl shadow-sky-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0ea5e9] to-[#6366f1]" />
              <motion.div
                className="absolute inset-0 bg-white/20"
                animate={{ opacity: [0, 0.4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-white font-black text-xl z-10">N</span>
            </div>
            <div>
              <div className="text-white font-bold text-[24px] tracking-tight leading-none">Nova</div>
              <div className="text-white/30 text-[11px] font-semibold tracking-widest uppercase mt-0.5">Workspace</div>
            </div>
          </div>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-3xl p-8"
          style={{
            background: 'rgba(255,255,255,0.045)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: '0 32px 80px -16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          {/* Inner top glow */}
          <div
            className="absolute top-0 left-8 right-8 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)' }}
          />

          <div className="mb-7">
            <h1 className="text-white text-[22px] font-bold tracking-tight mb-1.5">Welcome back</h1>
            <p className="text-white/35 text-[14px] font-medium">Sign in to your workspace</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <InputField
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@company.com"
              autoFocus
            />
            <InputField
              label="Password"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              suffix={
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="text-white/25 hover:text-white/60 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl px-4 py-3 text-[13px] font-semibold text-red-400"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="relative w-full font-bold py-3.5 rounded-xl text-[14px] text-white flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden mt-2"
              style={{
                background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                boxShadow: '0 8px 28px -4px rgba(14,165,233,0.45)',
              }}
            >
              {/* Shimmer */}
              {!submitting && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
                />
              )}
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Sign in <ArrowRight className="w-4 h-4" /></>
              )}
            </motion.button>
          </form>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-white/15 text-[12px] mt-6 font-medium tracking-wide"
        >
          Invite-only access · Contact your admin to get started
        </motion.p>
      </motion.div>
    </div>
  )
}

function InputField({
  label, type, value, onChange, placeholder, autoFocus, suffix,
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  autoFocus?: boolean
  suffix?: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-white/40 text-[10px] font-bold mb-2 uppercase tracking-[0.1em]">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          autoFocus={autoFocus}
          className="w-full rounded-xl px-4 py-3 text-[14px] text-white placeholder-white/18 font-medium outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.09)',
            paddingRight: suffix ? '2.75rem' : '1rem',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(14,165,233,0.55)'
            e.target.style.background = 'rgba(255,255,255,0.09)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(255,255,255,0.09)'
            e.target.style.background = 'rgba(255,255,255,0.06)'
          }}
        />
        {suffix && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{suffix}</div>
        )}
      </div>
    </div>
  )
}
