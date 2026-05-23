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

  if (!loading && user) return <Navigate to="/" replace />

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    setLoading(true)

    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })

    if (err) {
      setError(err.message)
      setSubmitting(false)
      setLoading(false)
      return
    }

    if (data.user) {
      await fetchProfile(data.user.id)
    }

    setLoading(false)
    navigate('/', { replace: true })
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center login-bg">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12 rounded-2xl overflow-hidden shadow-2xl shadow-sky-500/30">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0ea5e9] to-[#6366f1]" />
            <span className="absolute inset-0 flex items-center justify-center text-white font-black text-xl">N</span>
          </div>
          <div className="w-5 h-5 rounded-full border-2 border-[#0ea5e9] border-t-transparent animate-spin" />
        </motion.div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          33%  { background-position: 100% 50%; }
          66%  { background-position: 50% 0%; }
          100% { background-position: 0% 50%; }
        }
        .login-bg {
          background: linear-gradient(-45deg, #0f172a, #1e1b4b, #0f2942, #0f172a, #1e1b4b, #0c1a2e);
          background-size: 400% 400%;
          animation: gradientShift 12s ease infinite;
        }
        @keyframes orbDrift1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33%       { transform: translate(40px, -30px) scale(1.08); }
          66%       { transform: translate(-20px, 25px) scale(0.95); }
        }
        @keyframes orbDrift2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33%       { transform: translate(-35px, 25px) scale(1.05); }
          66%       { transform: translate(20px, -20px) scale(0.92); }
        }
        @keyframes orbDrift3 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50%       { transform: translate(25px, -35px) scale(1.1); }
        }
        .orb-1 { animation: orbDrift1 14s ease-in-out infinite; }
        .orb-2 { animation: orbDrift2 18s ease-in-out infinite; }
        .orb-3 { animation: orbDrift3 11s ease-in-out infinite; }
        @keyframes particleFloat {
          0%, 100% { transform: translateY(0); opacity: 0.2; }
          50%       { transform: translateY(-18px); opacity: 0.55; }
        }
        @keyframes logoGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(14,165,233,0.4), 0 0 40px rgba(14,165,233,0.15); }
          50%       { box-shadow: 0 0 35px rgba(14,165,233,0.65), 0 0 70px rgba(14,165,233,0.25); }
        }
        .logo-glow { animation: logoGlow 2.8s ease-in-out infinite; }
        @keyframes shimmerSlide {
          from { transform: translateX(-100%); }
          to   { transform: translateX(300%); }
        }
        .btn-shimmer:hover .shimmer-line { animation: shimmerSlide 0.65s ease forwards; }
      `}</style>

      <div className="fixed inset-0 login-bg flex items-center justify-center overflow-hidden">
        {/* Orbs */}
        <div className="orb-1 absolute top-[15%] right-[18%] w-[520px] h-[520px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle at 40% 40%, rgba(14,165,233,0.18) 0%, transparent 65%)', filter: 'blur(1px)' }} />
        <div className="orb-2 absolute bottom-[10%] left-[12%] w-[460px] h-[460px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle at 60% 60%, rgba(99,102,241,0.2) 0%, transparent 65%)', filter: 'blur(1px)' }} />
        <div className="orb-3 absolute top-[55%] left-[55%] w-[340px] h-[340px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 50%, rgba(14,165,233,0.12) 0%, transparent 65%)', filter: 'blur(2px)' }} />

        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }} />

        {/* Particles */}
        {([
          [8, 14, '#0ea5e9', 3.8, 0.4],   [6, 80, '#6366f1', 4.5, 2.1],
          [5, 38, '#22c55e', 5.2, 0.9],   [7, 90, '#0ea5e9', 3.5, 1.7],
          [4, 22, '#6366f1', 6.0, 3.2],   [6, 65, '#f59e0b', 4.2, 0.5],
          [5, 47, '#0ea5e9', 5.8, 2.8],   [4, 92, '#6366f1', 3.9, 1.3],
          [7, 30, '#0ea5e9', 4.7, 0.2],   [3, 75, '#22c55e', 5.5, 2.5],
        ] as [number, number, string, number, number][]).map(([sz, left, color, dur, delay], i) => (
          <div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: sz, height: sz,
              background: color,
              left: `${left}%`,
              top: `${[18, 12, 72, 35, 88, 25, 55, 65, 42, 78][i]}%`,
              opacity: 0.25,
              animation: `particleFloat ${dur}s ease-in-out ${delay}s infinite`,
            }}
          />
        ))}

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-[420px] mx-4"
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center mb-10"
          >
            <div
              className="logo-glow w-[72px] h-[72px] rounded-3xl relative overflow-hidden mb-4"
              style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)' }}
            >
              <div
                className="absolute inset-0 opacity-30"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 60%)' }}
              />
              <motion.div
                className="absolute inset-0 bg-white/20"
                animate={{ opacity: [0, 0.35, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-white font-black text-3xl z-10 tracking-tight">N</span>
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.5 }}
              className="text-white text-[28px] font-black tracking-tight leading-tight text-center"
            >
              Welcome to Nova
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.32 }}
              className="text-white/35 text-[15px] font-medium mt-1.5 tracking-wide"
            >
              Your workspace. Your team.
            </motion.p>
          </motion.div>

          {/* Frosted card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-3xl p-8"
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              boxShadow: '0 40px 100px -20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            {/* Top highlight line */}
            <div
              className="absolute top-0 left-10 right-10 h-px rounded-full"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)' }}
            />

            <form onSubmit={handleLogin} className="space-y-5">
              <DarkInput
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@company.com"
                autoFocus
              />
              <DarkInput
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

              <button
                type="submit"
                disabled={submitting}
                className="btn-shimmer relative w-full font-bold py-4 rounded-2xl text-[15px] text-white flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden mt-2 transition-all hover:scale-[1.015] active:scale-[0.99]"
                style={{
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
                  boxShadow: '0 10px 32px -4px rgba(14,165,233,0.5)',
                }}
              >
                <span
                  className="shimmer-line absolute top-0 bottom-0 w-1/3 pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)', left: 0 }}
                />
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>Sign in <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-white/18 text-[12px] mt-6 font-medium tracking-widest uppercase"
          >
            Invite only · Contact your admin
          </motion.p>
        </motion.div>
      </div>
    </>
  )
}

function DarkInput({
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
      <label className="block text-white/35 text-[10px] font-bold mb-2 uppercase tracking-[0.12em]">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          autoFocus={autoFocus}
          className="w-full rounded-xl px-4 py-3.5 text-[14px] text-white placeholder-white/18 font-medium outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            paddingRight: suffix ? '2.75rem' : '1rem',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'rgba(14,165,233,0.65)'
            e.target.style.background = 'rgba(255,255,255,0.1)'
            e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.12)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(255,255,255,0.1)'
            e.target.style.background = 'rgba(255,255,255,0.07)'
            e.target.style.boxShadow = 'none'
          }}
        />
        {suffix && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{suffix}</div>
        )}
      </div>
    </div>
  )
}
