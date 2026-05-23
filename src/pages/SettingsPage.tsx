import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Bell, Lock, Camera, Check, Loader2, Shield, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUpdateProfile } from '@/lib/queries'
import { supabase } from '@/lib/supabase'
import { getInitials, isDemoUser } from '@/lib/utils'

type Tab = 'profile' | 'notifications' | 'security'

const tabs = [
  { id: 'profile' as Tab, label: 'Profile', icon: User },
  { id: 'notifications' as Tab, label: 'Notifications', icon: Bell },
  { id: 'security' as Tab, label: 'Security', icon: Lock },
]

export function SettingsPage() {
  const { user, fetchProfile } = useAuthStore()
  const isDemo = isDemoUser(user)
  const [tab, setTab] = useState<Tab>('profile')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [fullName, setFullName] = useState(user?.full_name || '')

  const [notifs, setNotifs] = useState({
    mentions: true,
    assignments: true,
    dailyDigest: true,
    taskUpdates: false,
    weeklyReport: false,
  })

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError, setPwError] = useState('')

  const updateProfile = useUpdateProfile()

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    await updateProfile.mutateAsync({ id: user.id, full_name: fullName })
    await fetchProfile(user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleChangePassword = async () => {
    if (!newPassword) return
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return }
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters'); return }
    setPwError('')
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(false)
    if (error) { setPwError(error.message); return }
    setSaved(true)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setSaved(false), 2500)
  }

  const handleSave =
    tab === 'profile'
      ? handleSaveProfile
      : tab === 'security'
      ? handleChangePassword
      : async () => {
          setSaving(true)
          await new Promise((r) => setTimeout(r, 600))
          setSaving(false)
          setSaved(true)
          setTimeout(() => setSaved(false), 2500)
        }

  return (
    <motion.div
      className="max-w-[780px] mx-auto px-4 md:px-8 py-6 md:py-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mb-6 md:mb-8">
        <h1 className="text-[22px] md:text-[26px] font-bold text-[#0f172a] tracking-tight mb-1">Settings</h1>
        <p className="text-[13px] md:text-[14px] text-[#64748b]">Manage your account and workspace preferences.</p>
      </div>

      {isDemo && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-6 text-[13px] font-semibold"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}
        >
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          Demo account — settings are read-only. Create a real account to manage your workspace.
        </motion.div>
      )}

      {/* Tab switcher — full width on mobile */}
      <div className="flex gap-1 bg-[#f1f5f9] p-1 rounded-2xl w-full md:w-fit mb-6 md:mb-8 shadow-inner">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSaved(false) }}
            className={`flex-1 md:flex-initial flex items-center justify-center md:justify-start gap-2 px-3 md:px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all relative min-h-[44px] ${
              tab === t.id ? 'text-[#0f172a]' : 'text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            {tab === t.id && (
              <motion.div
                layoutId="settings-tab"
                className="absolute inset-0 bg-white rounded-xl shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              />
            )}
            <t.icon className="w-4 h-4 relative z-10" />
            <span className="relative z-10 hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-sm">
        <AnimatePresence mode="wait">
          {tab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="p-4 md:p-7"
            >
              <h2 className="text-[15px] font-bold text-[#0f172a] mb-5 md:mb-6">Profile Information</h2>

              {/* Avatar section */}
              <div className="flex items-center gap-4 md:gap-5 mb-6 md:mb-7 p-4 md:p-5 bg-[#f8fafc] rounded-2xl border border-[#f1f5f9]">
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-sky-200">
                    {user ? getInitials(user.full_name || user.email) : '?'}
                  </div>
                  <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border-2 border-[#f1f5f9] rounded-full flex items-center justify-center text-[#64748b] hover:bg-[#f1f5f9] shadow-md transition-colors">
                    <Camera className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] md:text-[15px] font-bold text-[#0f172a] leading-tight truncate">{user?.full_name || user?.email}</p>
                  <p className="text-[12px] text-[#94a3b8] mt-0.5 truncate">{user?.email}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold ${
                      user?.role === 'admin' ? 'bg-[#fdf4ff] text-[#a855f7]' : 'bg-[#f0f9ff] text-[#0ea5e9]'
                    }`}>
                      {user?.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {user?.role === 'admin' ? 'Admin' : 'Member'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#22c55e] bg-green-50 px-2.5 py-1 rounded-full font-semibold">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                      Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 md:space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest mb-2">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-[14px] text-[#0f172a] outline-none focus:border-[#0ea5e9]/50 focus:bg-white transition-all min-h-[44px]"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest mb-2">Email Address</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full bg-[#f8fafc] border border-[#f1f5f9] rounded-xl px-4 py-3 text-[14px] text-[#94a3b8] cursor-not-allowed min-h-[44px]"
                  />
                  <p className="text-[11px] text-[#94a3b8] mt-1.5">Email address cannot be changed.</p>
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="p-4 md:p-7"
            >
              <div className="flex items-start gap-3 mb-5 md:mb-6">
                <div className="w-9 h-9 rounded-xl bg-[#fdf4ff] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-[#a855f7]" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-[#0f172a]">Notification Preferences</h2>
                  <p className="text-[13px] text-[#94a3b8] mt-0.5">Choose what you're notified about via email.</p>
                </div>
              </div>

              <div className="space-y-1">
                {[
                  { key: 'mentions', label: '@Mentions', desc: 'When someone mentions you in a comment' },
                  { key: 'assignments', label: 'Assignments', desc: 'When a task is assigned to you' },
                  { key: 'dailyDigest', label: 'Daily Digest', desc: 'Daily summary sent at 8am' },
                  { key: 'taskUpdates', label: 'Task Updates', desc: "When tasks you're watching are updated" },
                  { key: 'weeklyReport', label: 'Weekly Report', desc: 'Weekly workspace summary every Monday' },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between py-4 border-b border-[#f8fafc] last:border-0 group min-h-[44px]"
                  >
                    <div className="flex-1 pr-4">
                      <p className="text-[13px] font-semibold text-[#0f172a]">{item.label}</p>
                      <p className="text-[12px] text-[#94a3b8] mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifs((n) => ({ ...n, [item.key]: !n[item.key as keyof typeof n] }))}
                      className="relative flex-shrink-0"
                      style={{ width: 44, height: 24 }}
                    >
                      <div className={`w-full h-full rounded-full transition-colors duration-200 ${notifs[item.key as keyof typeof notifs] ? 'bg-[#0ea5e9]' : 'bg-[#e2e8f0]'}`} />
                      <motion.div
                        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md"
                        animate={{ left: notifs[item.key as keyof typeof notifs] ? 21 : 2 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {tab === 'security' && (
            <motion.div
              key="security"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="p-4 md:p-7"
            >
              <div className="flex items-start gap-3 mb-5 md:mb-6">
                <div className="w-9 h-9 rounded-xl bg-[#f0fdf4] flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-[#22c55e]" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-[#0f172a]">Change Password</h2>
                  <p className="text-[13px] text-[#94a3b8] mt-0.5">Update your password regularly for security.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest mb-2">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-[14px] text-[#0f172a] outline-none focus:border-[#0ea5e9]/50 focus:bg-white transition-all min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-[14px] text-[#0f172a] outline-none focus:border-[#0ea5e9]/50 focus:bg-white transition-all min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-[14px] text-[#0f172a] outline-none focus:border-[#0ea5e9]/50 focus:bg-white transition-all min-h-[44px]"
                  />
                </div>
                {pwError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[12px] text-red-400 bg-red-50 px-3 py-2 rounded-lg"
                  >
                    {pwError}
                  </motion.p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="px-4 md:px-7 py-4 bg-[#f8fafc] border-t border-[#f1f5f9] flex justify-end">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleSave}
            disabled={saving || saved || isDemo}
            className="flex items-center gap-2 px-6 py-2.5 text-[13px] font-semibold text-white bg-[#0f172a] rounded-xl hover:bg-[#1e293b] transition-colors disabled:opacity-70 shadow-sm min-h-[44px]"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <>
                <Check className="w-4 h-4 text-[#22c55e]" />
                Saved!
              </>
            ) : (
              'Save changes'
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
