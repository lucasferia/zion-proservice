import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth, type AccessContextKind } from '../features/auth/auth-context'
import { App } from './App'

vi.mock('../features/auth/auth-context', async (importOriginal) => {
  const original = await importOriginal<typeof import('../features/auth/auth-context')>()
  return { ...original, useAuth: vi.fn() }
})
vi.mock('../features/portal/PortalContext', () => ({
  PortalContextProvider: ({ children }: { children: ReactNode }) => children,
}))
vi.mock('../features/portal/portal-context', () => ({
  usePortalContext: () => ({
    context: {
      user: { fullName: 'Ana Academia' }, organization: { name: 'Zion Operação' }, academy: { name: 'Academia Alfa' },
      access: { userStatus: 'active', commercialStatus: 'active', isTrialing: false, userUpdatedAt: '', commercialUpdatedAt: '' },
      unitCount: 1, units: [{ id: 'unit-a', name: 'Unidade Centro', city: 'São Paulo', state: 'SP' }],
    },
    selectedUnit: { id: 'unit-a', name: 'Unidade Centro', city: 'São Paulo', state: 'SP' },
    selectingUnitId: null, selectUnit: vi.fn(), refresh: vi.fn(),
  }),
}))
vi.mock('../features/academy-admin/AcademyPortalListPage', () => ({ AcademyPortalListPage: () => <h1>Administração das academias</h1> }))
vi.mock('../features/dashboard/DashboardPage', () => ({ DashboardPage: () => <h1>Início interno</h1> }))

const mockedUseAuth = vi.mocked(useAuth)

function renderContext(path: string, kind: AccessContextKind, blockingReason: string | null = null) {
  mockedUseAuth.mockReturnValue({
    session: null,
    status: 'authenticated',
    accessStatus: 'resolved',
    accessContext: { kind, blockingReason },
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

  it('redireciona vínculo sem unidade para acesso incompleto', async () => {
    renderContext('/portal', 'academy_pending', 'no_active_location')
    expect(await screen.findByRole('heading', { name: 'Unidade não disponível' })).toBeInTheDocument()
  })

  it('redireciona bloqueio comercial sem renderizar unidades', async () => {
    renderContext('/portal', 'academy_suspended', 'commercial_access_blocked')
    expect(await screen.findByRole('heading', { name: 'Acesso indisponível' })).toBeInTheDocument()
    expect(screen.queryByText('Unidade Centro')).not.toBeInTheDocument()
  })

  it('bloqueia conta inválida e não exibe o menu interno', async () => {
    renderContext('/portal', 'invalid_account')
    expect(await screen.findByRole('heading', { name: 'Conta sem acesso' })).toBeInTheDocument()
    expect(screen.queryByText('Estoque')).not.toBeInTheDocument()
  })

  it('exibe somente o shell próprio do portal para usuário externo ativo', async () => {
    renderContext('/portal', 'academy_active')
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/Sua academia.*contexto certo/i)
    expect(screen.queryByText('Clientes')).not.toBeInTheDocument()
    expect(screen.queryByText('Financeiro')).not.toBeInTheDocument()
  })

  it('usa fallback seguro para rota inexistente do Portal', async () => {
    renderContext('/portal/nao-existe', 'academy_active')
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/Sua academia/i)
  })

  it('libera a tela administrativa para owner', async () => {
    renderContext('/app/portal-academias', 'internal_owner')
    expect(await screen.findByRole('heading', { name: 'Administração das academias' })).toBeInTheDocument()
  })

  it('redireciona technician para o início ao abrir a administração do Portal', async () => {
    renderContext('/app/portal-academias', 'internal_technician')
    expect(await screen.findByRole('heading', { name: 'Início interno' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Administração das academias' })).not.toBeInTheDocument()
  })
})
