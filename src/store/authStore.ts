import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

interface AuthState {
  user: Profile | null
  session: Session | null
  loading: boolean
  setUser: (user: Profile | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  signOut: () => Promise<void>
  fetchProfile: (userId: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },
  fetchProfile: async (userId: string) => {
    // maybeSingle: a missing profile is a normal state (e.g. account created
    // before the schema was applied), not an error to throw on.
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (data) {
      set({ user: data as Profile })
      return
    }
    // Self-heal: create the profile for accounts that predate the auth trigger,
    // so onboarding/workspace creation works. Requires the profiles_insert RLS
    // policy (migration 0010).
    const { data: userData } = await supabase.auth.getUser()
    const u = userData.user
    if (u && u.id === userId) {
      const fullName =
        (u.user_metadata?.full_name as string | undefined) || u.email?.split('@')[0] || ''
      const { data: created } = await supabase
        .from('profiles')
        .insert({ id: u.id, email: u.email ?? '', full_name: fullName })
        .select()
        .maybeSingle()
      set({ user: (created as Profile) ?? null })
    } else {
      set({ user: null })
    }
  },
}))
