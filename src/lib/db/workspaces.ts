import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useAuthStore } from '@/store/authStore'
import type { Workspace, WorkspaceMember, Subscription, Plan, UserRole } from '@/types'
import { PLAN_LIMITS, isSuperOwner } from '@/lib/plan'

// ── Workspaces the current user belongs to ──────────────────────────────────
export function useWorkspaces() {
  const userId = useAuthStore((s) => s.user?.id)
  return useQuery({
    queryKey: ['workspaces', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('role, workspace:workspace_id(*)')
        .eq('user_id', userId!)
      if (error) throw error
      return (data ?? [])
        .map((r) => r.workspace as unknown as Workspace)
        .filter(Boolean)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
    },
  })
}

// Resolves and keeps the active workspace id valid against memberships.
export function useCurrentWorkspace() {
  const { data: workspaces = [], isLoading } = useWorkspaces()
  const { currentWorkspaceId, setWorkspace } = useWorkspaceStore()

  useEffect(() => {
    if (isLoading || workspaces.length === 0) return
    const valid = workspaces.some((w) => w.id === currentWorkspaceId)
    if (!valid) setWorkspace(workspaces[0].id)
  }, [isLoading, workspaces, currentWorkspaceId, setWorkspace])

  const current =
    workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0] ?? null
  return { workspace: current, workspaces, isLoading }
}

export function useCurrentWorkspaceId(): string | null {
  return useCurrentWorkspace().workspace?.id ?? null
}

// ── Members ─────────────────────────────────────────────────────────────────
export function useMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: ['members', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*, profile:user_id(*)')
        .eq('workspace_id', workspaceId!)
        .order('created_at')
      if (error) throw error
      return data as WorkspaceMember[]
    },
  })
}

export function useMyRole(workspaceId: string | null): UserRole | null {
  const userId = useAuthStore((s) => s.user?.id)
  const { data: members } = useMembers(workspaceId)
  return members?.find((m) => m.user_id === userId)?.role ?? null
}

export function useUpdateMemberRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, role, workspaceId }: { id: string; role: UserRole; workspaceId: string }) => {
      const { error } = await supabase.from('workspace_members').update({ role }).eq('id', id)
      if (error) throw error
      return workspaceId
    },
    onSuccess: (workspaceId) => qc.invalidateQueries({ queryKey: ['members', workspaceId] }),
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      const { error } = await supabase.from('workspace_members').delete().eq('id', id)
      if (error) throw error
      return workspaceId
    },
    onSuccess: (workspaceId) => qc.invalidateQueries({ queryKey: ['members', workspaceId] }),
  })
}

// ── Subscription / plan ─────────────────────────────────────────────────────
export function useSubscription(workspaceId: string | null) {
  return useQuery({
    queryKey: ['subscription', workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('workspace_id', workspaceId!)
        .maybeSingle()
      if (error) throw error
      return data as Subscription | null
    },
  })
}

// Create a new workspace (used by onboarding)
export function useCreateWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      // Read the owner id from the LIVE auth session, not the profile store —
      // this guarantees owner_id === auth.uid() even if the profile hasn't
      // loaded, which is what the workspaces RLS insert check requires.
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) throw new Error('You are not signed in. Please log out and sign in again.')

      // Self-heal: make sure a profile row exists before the owner_id FK insert.
      await supabase.from('profiles').upsert(
        {
          id: authUser.id,
          email: authUser.email ?? '',
          full_name:
            (authUser.user_metadata?.full_name as string | undefined) ||
            authUser.email?.split('@')[0] ||
            '',
        },
        { onConflict: 'id', ignoreDuplicates: true }
      )

      const slug =
        name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') + '-' + Date.now().toString(36)
      const { data, error } = await supabase
        .from('workspaces')
        .insert({ name, slug, owner_id: authUser.id })
        .select()
        .single()
      if (error) throw error
      return data as Workspace
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  })
}

// Invite a member: add existing users directly, otherwise store a pending invite.
export function useInviteMember(workspaceId: string | null) {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: UserRole }) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle()
      if (profile) {
        const { error } = await supabase
          .from('workspace_members')
          .insert({ workspace_id: workspaceId, user_id: profile.id, role })
        if (error) throw error // surfaces PLAN_LIMIT + duplicate errors
        return { added: true as const }
      }
      const { error } = await supabase
        .from('invites')
        .insert({ email: email.toLowerCase().trim(), role, invited_by: userId, workspace_id: workspaceId })
      if (error) throw error
      supabase.functions
        .invoke('send-notification', { body: { type: 'invite', email, role } })
        .catch(() => {})
      return { added: false as const }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', workspaceId] })
    },
  })
}

// Convenience hook consumed by <Gate> and billing UI.
export function usePlan(workspaceId: string | null) {
  const email = useAuthStore((s) => s.user?.email)
  const { data: sub, isLoading } = useSubscription(workspaceId)
  // App owner always has full access without a subscription (matches the
  // server-side workspace_plan() override in migration 0012).
  const owner = isSuperOwner(email)
  const plan: Plan = owner ? 'pro' : sub?.plan ?? 'free'
  return {
    plan,
    limits: PLAN_LIMITS[plan],
    subscription: sub,
    isLoading: owner ? false : isLoading,
    isPro: plan === 'pro',
  }
}
