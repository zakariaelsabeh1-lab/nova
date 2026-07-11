import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

// Initializes the auth session and keeps the store in sync with Supabase.
// Mount once, near the app root.
export function useAuthInit() {
  const { setSession, setUser, setLoading, fetchProfile } = useAuthStore()

  useEffect(() => {
    let mounted = true
    let settled = false
    const settle = () => {
      if (mounted && !settled) {
        settled = true
        setLoading(false)
      }
    }

    // Safety net: never let a hung getSession()/profile fetch pin the app on the
    // loading screen. On a reopened tab a stuck token refresh or the auth lock
    // held by another tab can make getSession() hang or reject; without this the
    // app "won't load unless you switch browsers". Force boot to complete.
    const safety = setTimeout(settle, 4000)

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!mounted) return
        setSession(session)
        try {
          if (session?.user) await fetchProfile(session.user.id)
        } catch {
          /* a missing/slow profile shouldn't block boot */
        } finally {
          settle()
        }
      })
      .catch(() => settle()) // getSession can reject on a bad persisted session

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      setSession(session)
      try {
        if (session?.user) await fetchProfile(session.user.id)
        else setUser(null)
      } catch {
        /* ignore */
      } finally {
        settle()
      }
    })

    return () => {
      mounted = false
      clearTimeout(safety)
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
