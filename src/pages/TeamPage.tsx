import { useState } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, Mail, Shield, User, MoreHorizontal, Search } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { getInitials } from '@/lib/utils'

const mockTeam = [
  { id: '1', full_name: 'Alex Martinez', email: 'alex@company.com', role: 'admin', avatar_url: null, joined: 'Jan 2026' },
  { id: '2', full_name: 'Sarah Kim', email: 'sarah@company.com', role: 'member', avatar_url: null, joined: 'Feb 2026' },
  { id: '3', full_name: 'Tom Rodriguez', email: 'tom@company.com', role: 'member', avatar_url: null, joined: 'Mar 2026' },
  { id: '4', full_name: 'Maya Patel', email: 'maya@company.com', role: 'member', avatar_url: null, joined: 'Apr 2026' },
]

const avatarColors = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#22c55e', '#ef4444', '#ec4899']

export function TeamPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = mockTeam.filter(
    (m) =>
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    await new Promise((r) => setTimeout(r, 1200))
    setInviting(false)
    setInviteEmail('')
    setShowInvite(false)
  }

  return (
    <motion.div
      className="max-w-[900px] mx-auto px-8 py-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[24px] font-bold text-[#0f172a] tracking-tight mb-1">Team</h1>
          <p className="text-[14px] text-[#64748b]">{mockTeam.length} members in your workspace</p>
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
      {showInvite && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6 bg-white border border-[#e2e8f0] rounded-2xl p-5 overflow-hidden"
        >
          <h3 className="text-[14px] font-semibold text-[#0f172a] mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#0ea5e9]" />
            Invite by email
          </h3>
          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              required
              className="flex-1 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-[13px] text-[#0f172a] placeholder-[#94a3b8] outline-none focus:border-[#0ea5e9]/50 transition-colors"
            />
            <select className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-3 py-2.5 text-[13px] text-[#64748b] outline-none">
              <option>Member</option>
              <option>Admin</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="px-5 py-2.5 text-[13px] font-medium text-white bg-[#0ea5e9] rounded-xl hover:bg-[#0284c7] transition-colors disabled:opacity-60"
            >
              {inviting ? 'Sending...' : 'Send invite'}
            </button>
            <button
              type="button"
              onClick={() => setShowInvite(false)}
              className="px-4 py-2.5 text-[13px] text-[#64748b] bg-[#f1f5f9] rounded-xl hover:bg-[#e2e8f0] transition-colors"
            >
              Cancel
            </button>
          </form>
        </motion.div>
      )}

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

      {/* Members list */}
      <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_2fr_1fr_80px] px-5 py-3 border-b border-[#f1f5f9] text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider">
          <span>Member</span>
          <span>Email</span>
          <span>Role</span>
          <span>Joined</span>
        </div>

        {filtered.map((member, i) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="grid grid-cols-[2fr_2fr_1fr_80px] px-5 py-4 border-b border-[#f8fafc] last:border-0 hover:bg-[#f8fafc] transition-colors items-center group"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-semibold"
                style={{ background: avatarColors[i % avatarColors.length] }}
              >
                {getInitials(member.full_name)}
              </div>
              <div>
                <p className="text-[13px] font-medium text-[#0f172a]">{member.full_name}</p>
              </div>
            </div>

            <span className="text-[13px] text-[#64748b]">{member.email}</span>

            <div>
              <span
                className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full font-medium ${
                  member.role === 'admin'
                    ? 'bg-[#fdf4ff] text-[#a855f7]'
                    : 'bg-[#f0f9ff] text-[#0ea5e9]'
                }`}
              >
                {member.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                {member.role === 'admin' ? 'Admin' : 'Member'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#94a3b8]">{member.joined}</span>
              {isAdmin && (
                <button className="opacity-0 group-hover:opacity-100 text-[#94a3b8] hover:text-[#64748b] transition-all">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
