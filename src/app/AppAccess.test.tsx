import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth, type AccessContextKind } from '../features/auth/auth-context'
import { App } from './App'

vi.mock('../features/auth/auth-context', async (importOriginal) => {
  const original = await importOriginal<typeof import('../features/auth/auth-context')>()
  return { ...original, useAuth: vi.fn() }
})

const mockedUseAuth = vi.mocked(useAuth)

function renderContext(path: string, kind: AccessContextKind) {
  mockedUseAuth.mockReturnValue({
    session: null,
    status: 'authenticated',
    accessStatus: 'resolved',
    accessContext: { kind, blockingReason: null },
    signIn: vi.fn(),
    signUpAcademy: vi.fn(),
    signOut: vi.fn(),
    retryAccessResolution: vi.fn(),
  })
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
}

describe('App por contexto de acesso', () => {
  beforeEach(() => mockedUseAuth.mockReset())

  it('redireciona usuário pendente que tenta abrir /app', async () => {
    renderContext('/app', 'academy_pending')
    expect(await screen.findByRole('heading', { name: 'Aguardando liberação' })).toBeInTheDocument()
    expect(screen.queryByText('Clientes')).not.toBeInTheDocument()
  })

  it('redireciona usuário suspenso para o bloqueio próprio', async () => {
    renderContext('/portal', 'academy_suspended')
    expect(await screen.findByRole('heading', { name: 'Portal suspenso' })).toBeInTheDocument()
  })

  it('bloqueia conta inválida e não exibe o menu interno', async () => {
    renderContext('/portal', 'invalid_account')
    expect(await screen.findByRole('heading', { name: 'Conta sem acesso' })).toBeInTheDocument()
    expect(screen.queryByText('Estoque')).not.toBeInTheDocument()
  })

  it('exibe somente a estrutura mínima do portal para usuário externo ativo', async () => {
    renderContext('/portal', 'academy_active')
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/Portal.*preparado\./i)
    expect(screen.queryByText('Clientes')).not.toBeInTheDocument()
    expect(screen.queryByText('Financeiro')).not.toBeInTheDocument()
  })
})
