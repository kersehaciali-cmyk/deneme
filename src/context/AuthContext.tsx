import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { cloudConfigured, publicAppUrl, supabase } from '../lib/supabase'
import type { AppUser } from '../types'

interface AuthState {
  configured: boolean
  loading: boolean
  session: Session | null
  user: User | null
  profile: AppUser | null
  passwordRecovery: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  updateOwnPassword: (password: string) => Promise<void>
  finishPasswordRecovery: () => void
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

function isPasswordLink() {
  const link = `${window.location.search}${window.location.hash}`
  return link.includes('type=recovery') || link.includes('type=invite')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(cloudConfigured)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [passwordRecovery, setPasswordRecovery] = useState(isPasswordLink)

  const loadProfile = async (user: User | null) => {
    if (!supabase || !user) {
      setProfile(null)
      return
    }
    const { data, error } = await supabase.from('profiles').select('id,name,phone,email,role,active,organization_id,customer_id').eq('id', user.id).single()
    if (error) throw error
    setProfile({
      id: data.id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      role: data.role,
      active: data.active,
      organizationId: data.organization_id,
      customerId: data.customer_id ?? undefined,
    } as AppUser)
  }

  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      try {
        await loadProfile(data.session?.user ?? null)
      } finally {
        if (active) setLoading(false)
      }
    }).catch(() => setLoading(false))

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      window.setTimeout(() => {
        void loadProfile(nextSession?.user ?? null).catch(() => setProfile(null))
      }, 0)
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthState>(() => ({
    configured: cloudConfigured,
    loading,
    session,
    user: session?.user ?? null,
    profile,
    passwordRecovery,
    signIn: async (email, password) => {
      if (!supabase) throw new Error('Bulut bağlantısı yapılandırılmamış.')
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    signOut: async () => {
      if (!supabase) return
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setProfile(null)
    },
    sendPasswordReset: async (email) => {
      if (!supabase) throw new Error('Bulut bağlantısı yapılandırılmamış.')
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: publicAppUrl })
      if (error) throw error
    },
    updateOwnPassword: async (password) => {
      if (!supabase) throw new Error('Bulut bağlantısı yapılandırılmamış.')
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
    },
    finishPasswordRecovery: () => setPasswordRecovery(false),
    refreshProfile: async () => loadProfile(session?.user ?? null),
  }), [loading, passwordRecovery, profile, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

