import type { Session } from '@supabase/supabase-js'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthContext'
import { useAuth } from './auth-context'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  rpc: vi.fn(),
  unsubscribe: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  isSupabaseConfigured: true,
  getSupabaseClient: () => ({
    auth: {
      getSession: mocks.getSession,
      signUp: mocks.signUp,
      signOut: mocks.signOut,
      signInWithPassword: vi.fn(),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: mocks.unsubscribe } } }),
    },
    rpc: mocks.rpc,
  }),
}))

function ContextProbe() {
  const auth = useAuth()
  return (
    <div>
      <span>{auth.status}</span>
      <span>{auth.accessStatus}</span>
      <span>{auth.accessContext?.kind ?? 'sem-contexto'}</span>
      <button type="button" onClick={() => void auth.signUpAcademy({ fullName: 'Maria Academia', email: 'maria@example.com', password: 'Academia123' })}>Cadastrar</button>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
    mocks.signUp.mockResolvedValue({ data: { session: null, user: { id: 'external-user' } }, error: null })
    mocks.signOut.mockResolvedValue({ error: null })
    mocks.rpc.mockResolvedValue({ data: [], error: null })
  })

  it('restaura a sessão e só resolve após consultar o contexto seguro', async () => {
    const session = { user: { id: 'owner-user' } } as Session
    mocks.getSession.mockResolvedValue({ data: { session }, error: null })
    mocks.rpc.mockResolvedValue({
      data: [{ access_context: 'internal_owner', blocking_reason: null }],
      error: null,
    })

    render(<AuthProvider><ContextProbe /></AuthProvider>)

    expect(screen.getByText('loading')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('internal_owner')).toBeInTheDocument())
    expect(screen.getByText('resolved')).toBeInTheDocument()
    expect(mocks.rpc).toHaveBeenCalledWith('resolve_access_context')
  })

  it('cadastro público envia somente nome no metadata e usa callback próprio', async () => {
    const user = userEvent.setup()
    render(<AuthProvider><ContextProbe /></AuthProvider>)
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }))

    expect(mocks.signUp).toHaveBeenCalledWith({
      email: 'maria@example.com',
      password: 'Academia123',
      options: {
        data: { full_name: 'Maria Academia' },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })
    const payload = mocks.signUp.mock.calls[0][0]
    expect(JSON.stringify(payload)).not.toMatch(/organization|owner|technician|client|location/)
  })
})
