import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Mail, Shield, User, Eye, MoreHorizontal, Search, Loader2, Check, Clock, X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import {
  useCurrentWorkspaceId, useMembers, useMyRole, useInviteMember, useUpdateMemberRole, useRemoveMember, usePlan,
  usePendingInvites, useCancelInvite,
} from '@/lib/db/workspaces'
import { getInitials } from '@/lib/utils'
import { notifyError, notifySuccess, errorMessage } from '@/lib/toast'
import type { UserRole } from '@/types'

const ROLE_META: Record<UserRole, { label: string; icon: typeof Shield; cls: string }> = {
  admin: { label: 'Admin', icon: Shield, cls: 'bg-[#fdf4ff] text-[#a855f7]' },
  member: { label: 'Member', icon: User, cls: 'bg-[#f0f9ff] text-[#0ea5e9]' },
  viewer: { label: 'Viewer', icon: Eye, cls: 'bg-[#f8fafc] text-[#64748b]' },
}

export function TeamPage() {
  const { user } = useAuthStore()
  const workspaceId = useCurrentWorkspaceId()
  const myRole = useMyRole(workspaceId)
  const isAdmin = myRole === 'admin'
  const { data: members = [], isLoading } = useMembers(workspaceId)
  const { limits, plan } = usePlan(workspaceId)
  const invite = useInviteMember(workspaceId)
  const updateRole = useUpdateMemberRole()
  const removeMember = useRemoveMember()
  const { data: pendingInvites = [] } = usePendingInvites(workspaceId)
  const cancelInvite = useCancelInvite(workspaceId)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('member')
  const [showInvite, setShowInvite] = useState(false)
  const [search, setSearch] = useState('')
  const [menuFor, setMenuFor] = useState<string | null>(null)

  const filtered = members.filter(
    (m) =>
      (m.profile?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.profile?.email || '').toLowerCase().includes(search.toLowerCase())
  )

  const atLimit = limits.members !== -1 && members.length >= limits.members

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await invite.mutateAsync({ email: inviteEmail, role: inviteRole })
      notifySuccess(
        res.added
          ? 'Member added to your team'
          : "Invite saved — they'll join automatically when they sign up with that email"
      )
      setInviteEmail('')
      setShowInvite(false)
    } catch (err) {
      notifyError(errorMessage(err, 'Could not invite'))
    }
  }

  return (
    <motion.div
      className="max-w-[900px] mx-auto px-4 md:px-8 py-6 md:py-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-start justify-between mb-6 md:mb-8 gap-4">
        <div>
          <h1 className="text-[22px] md:text-[26px] font-bold text-[#0f172a] tracking-tight mb-1">Team</h1>
          <p className="text-[13px] md:text-[14px] text-[#64748b]">
            {members.length} member{members.length !== 1 ? 's' : ''}
            {limits.members !== -1 && <span className="text-[#94a3b8]"> · {limits.members - members.length} seat{limits.members - members.length !== 1 ? 's' : ''} left on {plan}</span>}
          </p>
        </div>
        {isAdmin && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowInvite((v) => !v)}
            disabled={atLimit}
            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-white bg-[#0f172a] rounded-xl hover:bg-[#1e293b] transition-colors shadow-sm flex-shrink-0 min-h-[44px] disabled:opacity-50"
            title={atLimit ? 'Member limit reached — upgrade to Pro' : undefined}
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Invite member</span>
            <span className="sm:hidden">Invite</span>
          </motion.button>
        )}
      </div>

      {atLimit && isAdmin && (
        <div className="mb-4 px-4 py-3 rounded-xl text-[13px] font-medium bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]">
          You've reached the {limits.members}-member limit on the {plan} plan. <a href="/billing" className="font-bold underline">Upgrade to Pro</a> for unlimited members.
        </div>
      )}

      <AnimatePresence>
        {showInvite && !atLimit && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden mb-5">
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-4 md:p-5 shadow-sm">
              <h3 className="text-[14px] font-semibold text-[#0f172a] mb-4 flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-[#f0f9ff] flex items-center justify-center">
                  <Mail className="w-3.5 h-3.5 text-[#0ea5e9]" />
                </div>
                Invite by email
              </h3>
              <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                  className="flex-1 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-[13px] outline-none focus:border-[#0ea5e9]/50 min-h-[44px]"
                />
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as UserRole)} className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-[13px] text-[#64748b] outline-none min-h-[44px]">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button type="submit" disabled={invite.isPending} className="px-5 py-2.5 text-[13px] font-semibold text-white bg-[#0ea5e9] rounded-xl hover:bg-[#0284c7] disabled:opacity-60 flex items-center justify-center gap-2 min-h-[44px]">
                  {invite.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send invite'}
                </button>
              </form>
              <p className="text-[11px] text-[#94a3b8] mt-2.5">Existing users are added instantly. New emails receive an invite.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mb-4 md:mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members..." className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-white border border-[#e2e8f0] rounded-xl outline-none focus:border-[#0ea5e9]/50 shadow-sm min-h-[44px]" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#e2e8f0] shadow-sm">
        <div className="bg-white min-w-[560px]">
          <div className="grid grid-cols-[2fr_2fr_1.2fr_44px] px-5 py-3 border-b border-[#f1f5f9] text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest bg-[#f8fafc]">
            <span>Member</span><span>Email</span><span>Role</span><span />
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 text-[#94a3b8] animate-spin" /></div>
          ) : (
            filtered.map((member, i) => {
              const meta = ROLE_META[member.role]
              const isSelf = member.user_id === user?.id
              return (
                <motion.div key={member.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="grid grid-cols-[2fr_2fr_1.2fr_44px] px-5 py-4 border-b border-[#f8fafc] last:border-0 hover:bg-[#fafafa] items-center group min-h-[44px] relative">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}>
                      {getInitials(member.profile?.full_name || member.profile?.email || '?')}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#0f172a] leading-tight">{member.profile?.full_name || '—'}</p>
                      {isSelf && <span className="text-[10px] text-[#94a3b8]">You</span>}
                    </div>
                  </div>
                  <span className="text-[13px] text-[#64748b] truncate pr-4">{member.profile?.email}</span>
                  <div>
                    <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold ${meta.cls}`}>
                      <meta.icon className="w-3 h-3" /> {meta.label}
                    </span>
                  </div>
                  <div className="flex justify-center">
                    {isAdmin && !isSelf && (
                      <button onClick={() => setMenuFor(menuFor === member.id ? null : member.id)} className="opacity-0 group-hover:opacity-100 w-9 h-9 flex items-center justify-center text-[#94a3b8] hover:bg-[#f1f5f9] rounded-lg transition-all">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    )}
                    {menuFor === member.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                        <div className="absolute right-8 top-12 z-20 w-40 bg-white rounded-xl shadow-xl border border-[#e2e8f0] p-1.5">
                          <p className="px-2 py-1 text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Change role</p>
                          {(['admin', 'member', 'viewer'] as UserRole[]).map((r) => (
                            <button key={r} onClick={() => { updateRole.mutate({ id: member.id, role: r, workspaceId: workspaceId! }); setMenuFor(null) }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] hover:bg-[#f1f5f9]">
                              {ROLE_META[r].label}
                              {member.role === r && <Check className="w-3.5 h-3.5 text-[#0ea5e9] ml-auto" />}
                            </button>
                          ))}
                          <button onClick={() => { removeMember.mutate({ id: member.id, workspaceId: workspaceId! }); setMenuFor(null) }} className="w-full text-left px-2 py-1.5 rounded-lg text-[13px] text-[#ef4444] hover:bg-red-50 mt-0.5">Remove</button>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {/* Pending invites — people invited who haven't signed up yet */}
      {pendingInvites.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-2.5">
            <Clock className="w-4 h-4 text-[#f59e0b]" />
            <h2 className="text-[14px] font-bold text-[#0f172a]">Pending invites</h2>
            <span className="text-[12px] font-semibold text-[#94a3b8]">{pendingInvites.length}</span>
          </div>
          <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-sm">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-[#f8fafc] last:border-0">
                <div className="w-9 h-9 rounded-full bg-[#fff7ed] flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-[#f59e0b]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#0f172a] truncate">{inv.email}</p>
                  <p className="text-[11px] text-[#94a3b8]">Joins as {ROLE_META[inv.role]?.label ?? inv.role} when they sign up</p>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#fff7ed] text-[#c2410c]">Pending</span>
                {isAdmin && (
                  <button
                    onClick={() => cancelInvite.mutate(inv.id)}
                    className="w-8 h-8 flex items-center justify-center text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#f1f5f9] rounded-lg transition-all"
                    title="Cancel invite"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-[11.5px] text-[#94a3b8] mt-2">
            Invited people join automatically the first time they sign up with that email address.
          </p>
        </div>
      )}
    </motion.div>
  )
}
