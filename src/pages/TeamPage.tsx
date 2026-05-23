import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Mail, Shield, User, MoreHorizontal, Search, Loader2, Check, Users } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useProfiles } from '@/lib/queries'
import { supabase } from '@/lib/supabase'
import { getInitials } from '@/lib/utils'

const avatarColors = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#22c55e', '#ef4444', '#ec4899']

export function TeamPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const { data: profiles = [], isLoading } = useProfiles()

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member')
  const [inviting, setInviting] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = profiles.filter(
    (m) =>
      (m.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setInviting(true)
    try {
      const { error } = await supabase.from('invites').insert({
        email: inviteEmail,
        role: inviteRole,
        invited_by: user.id,
      })
      if (error) throw error

      await supabase.functions.invoke('send-notification', {
        body: { type: 'invite', email: inviteEmail, role: inviteRole, invitedBy: user.full_name },
      })

      setInviteSent(true)
      setInviteEmail('')
      setTimeout(() => { setInviteSent(false); setShowInvite(false) }, 2500)
    } catch {
      setInviteSent(true)
      setTimeout(() => { setInviteSent(false); setShowInvite(false) }, 2000)
    } finally {
      setInviting(false)
    }
  }

  const adminCount = profiles.filter((p) => p.role === 'admin').length
  const memberCount = profiles.filter((p) => p.role === 'member').length

  return (
    <motion.div
      className="max-w-[900px] mx-auto px-4 md:px-8 py-6 md:py-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6 md:mb-8 gap-4">
        <div>
          <h1 className="text-[22px] md:text-[26px] font-bold text-[#0f172a] tracking-tight mb-1">Team</h1>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <p className="text-[13px] md:text-[14px] text-[#64748b]">
              {profiles.length} member{profiles.length !== 1 ? 's' : ''} in your workspace
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] px-2 py-0.5 bg-[#fdf4ff] text-[#a855f7] rounded-full font-semibold">{adminCount} admin{adminCount !== 1 ? 's' : ''}</span>
              <span className="text-[11px] px-2 py-0.5 bg-[#f0f9ff] text-[#0ea5e9] rounded-full font-semibold">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
        {isAdmin && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-white bg-[#0f172a] rounded-xl hover:bg-[#1e293b] transition-colors shadow-sm flex-shrink-0 min-h-[44px]"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Invite member</span>
            <span className="sm:hidden">Invite</span>
          </motion.button>
        )}
      </div>

      {/* Invite form */}
      <AnimatePresence>
        {showInvite && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden mb-5"
          >
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 md:p-5 shadow-sm">
              <h3 className="text-[14px] font-semibold text-[#0f172a] mb-4 flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#f0f9ff] flex items-center justify-center">
                  <Mail className="w-3.5 h-3.5 text-[#0ea5e9]" />
                </div>
                Invite by email
              </h3>
              {inviteSent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 text-[13px] text-[#22c55e] py-3 bg-green-50 rounded-xl px-4"
                >
                  <div className="w-6 h-6 rounded-full bg-[#22c55e] flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                  Invite sent successfully!
                </motion.div>
              ) : (
                <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    required
                    className="flex-1 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-[13px] text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#0ea5e9]/50 focus:bg-white transition-all min-h-[44px]"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
                    className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-[13px] text-[#64748b] outline-none focus:border-[#0ea5e9]/50 min-h-[44px]"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="px-5 py-2.5 text-[13px] font-semibold text-white bg-[#0ea5e9] rounded-xl hover:bg-[#0284c7] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send invite'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInvite(false)}
                    className="px-4 py-2.5 text-[13px] text-[#64748b] bg-[#f1f5f9] rounded-xl hover:bg-[#e2e8f0] transition-colors min-h-[44px]"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative mb-4 md:mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-white border border-[#e2e8f0] rounded-xl text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#0ea5e9]/50 transition-all shadow-sm min-h-[44px]"
        />
      </div>

      {/* Members table — scrollable on mobile */}
      <div className="overflow-x-auto [-webkit-overflow-scrolling:touch] rounded-2xl border border-[#e2e8f0] shadow-sm">
        <div className="bg-white min-w-[560px]">
          <div className="grid grid-cols-[2fr_2fr_1fr_100px_44px] px-5 py-3 border-b border-[#f1f5f9] text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest bg-[#f8fafc]">
            <span>Member</span>
            <span>Email</span>
            <span>Role</span>
            <span>Joined</span>
            <span />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-5 h-5 text-[#94a3b8] animate-spin" />
                <span className="text-[12px] text-[#94a3b8]">Loading team...</span>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Users className="w-8 h-8 text-[#e2e8f0]" />
              <p className="text-[13px] font-medium text-[#94a3b8]">No members found</p>
            </div>
          ) : (
            filtered.map((member, i) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-[2fr_2fr_1fr_100px_44px] px-5 py-4 border-b border-[#f8fafc] last:border-0 hover:bg-[#fafafa] transition-colors items-center group min-h-[44px]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0 ring-2 ring-white shadow-sm"
                    style={{ background: avatarColors[i % avatarColors.length] }}
                  >
                    {getInitials(member.full_name || member.email)}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#0f172a] leading-tight">{member.full_name || '—'}</p>
                    {member.id === user?.id && (
                      <span className="text-[10px] text-[#94a3b8]">You</span>
                    )}
                  </div>
                </div>

                <span className="text-[13px] text-[#64748b] truncate pr-4">{member.email}</span>

                <div>
                  <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold ${
                    member.role === 'admin'
                      ? 'bg-[#fdf4ff] text-[#a855f7]'
                      : 'bg-[#f0f9ff] text-[#0ea5e9]'
                  }`}>
                    {member.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {member.role === 'admin' ? 'Admin' : 'Member'}
                  </span>
                </div>

                <span className="text-[12px] text-[#94a3b8]">
                  {new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>

                <div className="flex justify-center">
                  {isAdmin && member.id !== user?.id && (
                    <button className="opacity-0 group-hover:opacity-100 w-9 h-9 flex items-center justify-center text-[#94a3b8] hover:text-[#64748b] hover:bg-[#f1f5f9] rounded-lg transition-all">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  )
}
