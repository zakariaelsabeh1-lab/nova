import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { BoardPage } from '@/pages/BoardPage'
import { TeamPage } from '@/pages/TeamPage'
import { SettingsPage } from '@/pages/SettingsPage'

function AppLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #060c18 0%, #0f172a 60%, #1e1b4b 100%)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-5"
      >
        <div className="relative w-12 h-12 rounded-2xl overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0ea5e9] to-[#6366f1]" />
          <span className="absolute inset-0 flex items-center justify-center text-white font-black text-xl">N</span>
        </div>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#0ea5e9]"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  )
}

export default function App() {
  const { loading, setLoading, fetchProfile } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false))
      } else {
        // Auto-login with demo account — no login page shown
        supabase.auth.signInWithPassword({ email: 'demo@nova.app', password: 'demo1234' })
          .then(({ data }) => { if (data.user) return fetchProfile(data.user.id) })
          .finally(() => setLoading(false))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (_event === 'TOKEN_REFRESHED' && session?.user) {
          fetchProfile(session.user.id)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile, setLoading])

  if (loading) return <AppLoader />

  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="board/:boardId" element={<BoardPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
