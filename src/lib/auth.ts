import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

// Initializes the auth session and keeps the store in sync with Supabase.
// Mount once, near the app root.
export function useAuthInit() {
  const { setSession, setUser, setLoading, fetchProfile } = useAuthStore()

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      try {
        if (session?.user) await fetchProfile(session.user.id)
      } finally {
        setLoading(false) // never leave the app stuck on the loading screen
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      try {
        if (session?.user) await fetchProfile(session.user.id)
        else setUser(null)
      } finally {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [setSession, setUser, setLoading, fetchProfile])
}

// ── Auth actions (thin wrappers used by the login/onboarding screens) ───────
export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUpWithPassword(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
  if (error) throw error
  return data
}

export async function signInWithMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) throw error
}
