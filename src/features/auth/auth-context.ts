import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export type AuthStatus =
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'configuration_error'

export type AccessContextKind =
  | 'internal_owner'
  | 'internal_technician'
  | 'academy_pending'
  | 'academy_active'
  | 'academy_suspended'
  | 'invalid_account'

export type AccessContext = {
  kind: AccessContextKind
  blockingReason: string | null
}

export type AccessStatus = 'idle' | 'loading' | 'resolved' | 'error'

export type AcademySignUpInput = {
  fullName: string
  email: string
  password: string
}

export type AcademySignUpResult = {
  error: string | null
  emailConfirmationRequired: boolean
}

export type AuthContextValue = {
  session: Session | null
  status: AuthStatus
  accessStatus: AccessStatus
  accessContext: AccessContext | null
  signIn: (email: string, password: string) => Promise<string | null>
  signUpAcademy: (input: AcademySignUpInput) => Promise<AcademySignUpResult>
  signOut: () => Promise<void>
  retryAccessResolution: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}
