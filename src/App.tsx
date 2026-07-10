import type { ReactNode } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { useAuthInit } from '@/lib/auth'
import { useWorkspaces } from '@/lib/db/workspaces'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { BoardView } from '@/pages/BoardView'
import { MyWorkPage } from '@/pages/MyWorkPage'
import { TeamPage } from '@/pages/TeamPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { BillingPage } from '@/pages/BillingPage'

function AppLoader() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #060c18 0%, #0f172a 60%, #1e1b4b 100%)' }}
    >
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-5">
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

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuthStore()
  const location = useLocation()
  if (loading) return <AppLoader />
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />
  return <>{children}</>
}

function RequireWorkspace({ children }: { children: ReactNode }) {
  const { data: workspaces, isLoading } = useWorkspaces()
  if (isLoading) return <AppLoader />
  if (!workspaces || workspaces.length === 0) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export default function App() {
  useAuthInit()
  const loading = useAuthStore((s) => s.loading)

  if (loading) return <AppLoader />

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <OnboardingPage />
          </RequireAuth>
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <RequireWorkspace>
              <AppLayout />
            </RequireWorkspace>
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="board/:boardId" element={<BoardView />} />
        <Route path="my-work" element={<MyWorkPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="billing" element={<BillingPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
