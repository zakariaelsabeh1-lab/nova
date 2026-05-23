import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { BoardPage } from '@/pages/BoardPage'
import { TeamPage } from '@/pages/TeamPage'
import { SettingsPage } from '@/pages/SettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  if (loading) return <AppLoader />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

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
  const { setUser, setLoading, fetchProfile } = useAuthStore()

  useEffect(() => {
    // Check for existing session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    // Listen for auth changes (token refresh, sign out, etc.)
    // Do NOT call fetchProfile here on SIGNED_IN — LoginPage handles that
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (_event === 'SIGNED_OUT') {
          setUser(null)
          setLoading(false)
        } else if (_event === 'TOKEN_REFRESHED' && session?.user) {
          // Token refreshed — re-fetch profile silently
          fetchProfile(session.user.id)
        }
        // SIGNED_IN is handled by LoginPage.handleLogin directly
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchProfile, setUser, setLoading])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="board/:boardId" element={<BoardPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
