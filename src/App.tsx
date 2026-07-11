import type { ReactNode } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { supabaseConfigured } from '@/lib/supabase'
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

function ConfigError() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #060c18 0%, #0f172a 60%, #1e1b4b 100%)' }}
    >
      <div className="max-w-[440px] w-full rounded-3xl p-7" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="w-11 h-11 rounded-2xl bg-[#ef4444]/15 flex items-center justify-center mb-4">
          <span className="text-[#ef4444] text-xl font-black">!</span>
        </div>
        <h1 className="text-white text-[18px] font-bold mb-2">Supabase isn't configured</h1>
        <p className="text-white/50 text-[13.5px] leading-relaxed mb-4">
          Create a <code className="text-[#38bdf8]">.env</code> file in the project root with your
          project URL and anon key, then restart the dev server (Vite only reads env at startup):
        </p>
        <pre className="text-[12px] text-white/70 bg-black/30 rounded-xl p-3 overflow-x-auto mb-4">
{`VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon / publishable key>`}
        </pre>
        <p className="text-white/35 text-[12px]">
          Find both under Supabase → Project Settings → API. Then stop and re-run <code className="text-[#38bdf8]">npm run dev</code>.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  useAuthInit()
  const loading = useAuthStore((s) => s.loading)

  if (!supabaseConfigured) return <ConfigError />
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
