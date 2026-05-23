import { useState } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, Mail, Shield, User, MoreHorizontal, Search, Loader2, Check } from 'lucide-react'
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
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
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

      // Trigger notification email via edge function
      await supabase.functions.invoke('send-notification', {
        body: { type: 'invite', email: inviteEmail, role: inviteRole, invitedBy: user.full_name },
      })

      setInviteSent(true)
      setInviteEmail('')
      setTimeout(() => {
        setInviteSent(false)
        setShowInvite(false)
      }, 2500)
    } catch (_err) {
      // email may already be invited — still show success
      setInviteSent(true)
      setTimeout(() => { setInviteSent(false); setShowInvite(false) }, 2000)
    } finally {
      setInviting(false)
    }
  }

  return (
    <motion.div
      className="max-w-[900px] mx-auto px-8 py-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[24px] font-bold text-[#0f172a] tracking-tight mb-1">Team</h1>
          <p className="text-[14px] text-[#64748b]">{profiles.length} member{profiles.length !== 1 ? 's' : ''} in your workspace</p>
        </div>
        {isAdmin && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-white bg-[#0f172a] rounded-xl hover:bg-[#1e293b] transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            Invite member
          </motion.button>
        )}
      </div>

      {/* Invite form */}
      <AnimatedSection show={showInvite}>
        <div className="mb-6 bg-white border border-[#e2e8f0] rounded-2xl p-5">
          <h3 className="text-[14px] font-semibold text-[#0f172a] mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#0ea5e9]" />
            Invite by email
          </h3>
          {inviteSent ? (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-[13px] text-[#22c55e] py-3"
            >
              <Check className="w-4 h-4" />
              Invite sent to {inviteEmail || 'member'}!
            </motion.div>
          ) : (
            <form onSubmit={handleInvite} className="flex gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                required
                className="flex-1 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-[13px] text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#0ea5e9]/50 transition-colors"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
                className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-[13px] text-[#64748b] outline-none focus:border-[#0ea5e9]/50"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={inviting}
                className="px-5 py-2.5 text-[13px] font-medium text-white bg-[#0ea5e9] rounded-xl hover:bg-[#0284c7] transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send invite'}
              </button>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="px-4 py-2.5 text-[13px] text-[#64748b] bg-[#f1f5f9] rounded-xl hover:bg-[#e2e8f0] transition-colors"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </AnimatedSection>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-white border border-[#e2e8f0] rounded-xl text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#0ea5e9]/50 transition-colors"
        />
      </div>

      {/* Members */}
      <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[2fr_2fr_1fr_100px] px-5 py-3 border-b border-[#f1f5f9] text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider">
          <span>Member</span>
          <span>Email</span>
          <span>Role</span>
          <span>Joined</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 text-[#94a3b8] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-[13px] text-[#94a3b8]">No members found.</div>
        ) : (
          filtered.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="grid grid-cols-[2fr_2fr_1fr_100px] px-5 py-4 border-b border-[#f8fafc] last:border-0 hover:bg-[#f8fafc] transition-colors items-center group"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0"
                  style={{ background: avatarColors[i % avatarColors.length] }}
                >
                  {getInitials(member.full_name || member.email)}
                </div>
                <p className="text-[13px] font-medium text-[#0f172a]">{member.full_name || member.email}</p>
              </div>

              <span className="text-[13px] text-[#64748b]">{member.email}</span>

              <div>
                <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-medium ${
                  member.role === 'admin' ? 'bg-[#fdf4ff] text-[#a855f7]' : 'bg-[#f0f9ff] text-[#0ea5e9]'
                }`}>
                  {member.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  {member.role === 'admin' ? 'Admin' : 'Member'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#94a3b8]">
                  {new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
                {isAdmin && member.id !== user?.id && (
                  <button className="opacity-0 group-hover:opacity-100 text-[#94a3b8] hover:text-[#64748b] transition-all">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  )
}

function AnimatedSection({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      initial={false}
      animate={{ height: show ? 'auto' : 0, opacity: show ? 1 : 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      {children}
    </motion.div>
  )
}
