import type { Session } from '@supabase/supabase-js'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase'
import { getFriendlyAuthError } from './authErrors'
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() =>
    isSupabaseConfigured ? 'loading' : 'configuration_error',
  )

  useEffect(() => {
    const client = getSupabaseClient()

    if (!isSupabaseConfigured || !client) {
      return
    }

    let mounted = true

    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return
        if (error) {
          setSession(null)
          setStatus('unauthenticated')
          return
        }

        setSession(data.session)
        setStatus(data.session ? 'authenticated' : 'unauthenticated')
      })
      .catch(() => {
        if (!mounted) return
        setSession(null)
        setStatus('unauthenticated')
      })

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      setStatus(nextSession ? 'authenticated' : 'unauthenticated')
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      status,
      signIn: async (email, password) => {
        const client = getSupabaseClient()
        if (!client) return 'A integração com o Supabase ainda não foi configurada.'

        const cleanEmail = email.trim()
        const targetEmail = cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@zion.com`

        try {
          const { error } = await client.auth.signInWithPassword({ email: targetEmail, password })
          return error ? getFriendlyAuthError(error) : null
        } catch {
          return 'Não foi possível acessar o serviço de autenticação. Tente novamente.'
        }
      },
      signOut: async () => {
        const client = getSupabaseClient()
        if (client) await client.auth.signOut()
      },
    }),
    [session, status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
