import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Bell, Lock, Camera, Check, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUpdateProfile } from '@/lib/queries'
import { supabase } from '@/lib/supabase'
import { getInitials } from '@/lib/utils'

type Tab = 'profile' | 'notifications' | 'security'

export function SettingsPage() {
  const { user, fetchProfile } = useAuthStore()
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
    setTimeout(() => setSaved(false), 2000)
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
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSave = tab === 'profile' ? handleSaveProfile : tab === 'security' ? handleChangePassword : async () => {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 600))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const tabs = [
    { id: 'profile' as Tab, label: 'Profile', icon: User },
    { id: 'notifications' as Tab, label: 'Notifications', icon: Bell },
    { id: 'security' as Tab, label: 'Security', icon: Lock },
  ]

  return (
    <motion.div
      className="max-w-[800px] mx-auto px-8 py-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-[24px] font-bold text-[#0f172a] tracking-tight mb-6">Settings</h1>

      <div className="flex gap-1 bg-[#f1f5f9] p-1 rounded-xl w-fit mb-8">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSaved(false) }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
              tab === t.id ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden">
        {tab === 'profile' && (
          <div className="p-6">
            <h2 className="text-[15px] font-semibold text-[#0f172a] mb-5">Profile Information</h2>
            <div className="flex items-center gap-5 mb-6 pb-6 border-b border-[#f1f5f9]">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-[#0ea5e9] flex items-center justify-center text-white text-xl font-semibold">
                  {user ? getInitials(user.full_name || user.email) : '?'}
                </div>
                <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border border-[#e2e8f0] rounded-full flex items-center justify-center text-[#64748b] hover:bg-[#f1f5f9] shadow-sm">
                  <Camera className="w-3 h-3" />
                </button>
              </div>
              <div>
                <p className="text-[14px] font-medium text-[#0f172a]">{user?.full_name || user?.email}</p>
                <p className="text-[12px] text-[#94a3b8]">{user?.email}</p>
                <p className="text-[11px] text-[#94a3b8] mt-1 capitalize">Role: <span className="text-[#64748b]">{user?.role}</span></p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-[13px] text-[#0f172a] outline-none focus:border-[#0ea5e9]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-[13px] text-[#94a3b8] cursor-not-allowed"
                />
                <p className="text-[11px] text-[#94a3b8] mt-1">Email cannot be changed.</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'notifications' && (
          <div className="p-6">
            <h2 className="text-[15px] font-semibold text-[#0f172a] mb-1">Notification Preferences</h2>
            <p className="text-[13px] text-[#94a3b8] mb-5">Choose what you're notified about via email.</p>
            <div className="space-y-1">
              {[
                { key: 'mentions', label: '@Mentions', desc: 'When someone mentions you in a comment' },
                { key: 'assignments', label: 'Assignments', desc: 'When a task is assigned to you' },
                { key: 'dailyDigest', label: 'Daily Digest', desc: 'Daily summary sent at 8am' },
                { key: 'taskUpdates', label: 'Task Updates', desc: "When tasks you're watching are updated" },
                { key: 'weeklyReport', label: 'Weekly Report', desc: 'Weekly workspace summary every Monday' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-4 border-b border-[#f1f5f9] last:border-0">
                  <div>
                    <p className="text-[13px] font-medium text-[#0f172a]">{item.label}</p>
                    <p className="text-[12px] text-[#94a3b8]">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => setNotifs((n) => ({ ...n, [item.key]: !n[item.key as keyof typeof n] }))}
                    className="relative transition-all flex-shrink-0"
                    style={{ width: 40, height: 22 }}
                  >
                    <div className={`w-full h-full rounded-full transition-colors ${notifs[item.key as keyof typeof notifs] ? 'bg-[#0ea5e9]' : 'bg-[#e2e8f0]'}`} />
                    <div className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-all ${notifs[item.key as keyof typeof notifs] ? 'left-[19px]' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'security' && (
          <div className="p-6">
            <h2 className="text-[15px] font-semibold text-[#0f172a] mb-5">Change Password</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">Current Password</label>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••"
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-[13px] text-[#0f172a] outline-none focus:border-[#0ea5e9]/50 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">New Password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••"
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-[13px] text-[#0f172a] outline-none focus:border-[#0ea5e9]/50 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-2">Confirm New Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••"
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-3 text-[13px] text-[#0f172a] outline-none focus:border-[#0ea5e9]/50 transition-colors" />
              </div>
              {pwError && <p className="text-[12px] text-red-400">{pwError}</p>}
            </div>
          </div>
        )}

        <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#f1f5f9] flex justify-end">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleSave}
            disabled={saving || saved}
            className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium text-white bg-[#0f172a] rounded-xl hover:bg-[#1e293b] transition-colors disabled:opacity-70"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <><Check className="w-4 h-4" />Saved!</> : 'Save changes'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
