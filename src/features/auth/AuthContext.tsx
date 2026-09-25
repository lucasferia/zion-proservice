import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { queryClient } from '../../lib/queryClient'
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase'
import { clearPortalUnitPreference } from '../portal/portalPreferences'
import { getFriendlyAuthError } from './authErrors'
import {
  AuthContext,
  type AccessContext,
  type AccessStatus,
  type AuthContextValue,
  type AuthStatus,
} from './auth-context'

type AccessContextRow = {
  access_context: AccessContext['kind']
  blocking_reason: string | null
}

function getFriendlySignUpError(status?: number) {
  if (status === 422) return 'Este e-mail já está cadastrado ou os dados informados são inválidos.'
  if (status === 429) return 'Muitas tentativas. Aguarde um pouco e tente novamente.'
  return 'Não foi possível concluir o cadastro agora. Tente novamente.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() =>
    isSupabaseConfigured ? 'loading' : 'configuration_error',
  )
  const [accessStatus, setAccessStatus] = useState<AccessStatus>('idle')
  const [accessContext, setAccessContext] = useState<AccessContext | null>(null)
  const resolutionVersion = useRef(0)
  const currentUserId = useRef<string | null>(null)

  const clearPortalState = useCallback((userId: string | null) => {
    queryClient.removeQueries({ queryKey: ['academy-portal-context'] })
    if (userId) clearPortalUnitPreference(userId)
  }, [])

  const resolveAccess = useCallback(async (nextSession: Session | null) => {
    const version = ++resolutionVersion.current
    if (!nextSession) {
      setAccessContext(null)
      setAccessStatus('idle')
      return
    }

    const client = getSupabaseClient()
    if (!client) return
    setAccessContext(null)
    setAccessStatus('loading')

    try {
      const { data, error } = await client.rpc('resolve_access_context')
      if (version !== resolutionVersion.current) return
      const row = (data as AccessContextRow[] | null)?.[0]
      if (error || !row) {
        setAccessStatus('error')
        return
      }
      setAccessContext({ kind: row.access_context, blockingReason: row.blocking_reason })
      setAccessStatus('resolved')
    } catch {
      if (version !== resolutionVersion.current) return
      setAccessStatus('error')
    }
  }, [])

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

        currentUserId.current = data.session?.user.id ?? null
        setSession(data.session)
        setStatus(data.session ? 'authenticated' : 'unauthenticated')
        void resolveAccess(data.session)
      })
      .catch(() => {
        if (!mounted) return
        setSession(null)
        setStatus('unauthenticated')
      })

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      const nextUserId = nextSession?.user.id ?? null
      if (currentUserId.current && currentUserId.current !== nextUserId) {
        clearPortalState(currentUserId.current)
      }
      currentUserId.current = nextUserId
      setSession(nextSession)
      setStatus(nextSession ? 'authenticated' : 'unauthenticated')
      void resolveAccess(nextSession)
    })

    return () => {
      mounted = false
      data.subscription.unsubscribe()
    }
  }, [clearPortalState, resolveAccess])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      status,
      accessStatus,
      accessContext,
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
      signUpAcademy: async ({ fullName, email, password }) => {
        const client = getSupabaseClient()
        if (!client) {
          return {
            error: 'A integração com o Supabase ainda não foi configurada.',
            emailConfirmationRequired: false,
          }
        }

        try {
          const { data, error } = await client.auth.signUp({
            email: email.trim().toLowerCase(),
            password,
            options: {
              data: { full_name: fullName.trim() },
              emailRedirectTo: `${window.location.origin}/auth/confirm`,
            },
          })
          if (error) {
            return { error: getFriendlySignUpError(error.status), emailConfirmationRequired: false }
          }

          const emailConfirmationRequired = !data.session
          if (data.session) await client.auth.signOut()
          return { error: null, emailConfirmationRequired }
        } catch {
          return {
            error: 'Não foi possível acessar o serviço de autenticação. Tente novamente.',
            emailConfirmationRequired: false,
          }
        }
      },
      signOut: async () => {
        const client = getSupabaseClient()
        clearPortalState(session?.user.id ?? currentUserId.current)
        if (client) await client.auth.signOut()
      },
      retryAccessResolution: async () => resolveAccess(session),
    }),
    [accessContext, accessStatus, clearPortalState, resolveAccess, session, status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
