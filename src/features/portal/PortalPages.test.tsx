import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../auth/auth-context'
import { usePortalContext } from './portal-context'
import {
  PortalBlockedPage,
  PortalHomePage,
  PortalProfilePage,
  PortalShell,
  PortalUnavailablePage,
  PortalUnitsPage,
} from './PortalPages'
import type { PortalContextData } from './types'

vi.mock('../auth/auth-context', () => ({ useAuth: vi.fn() }))
vi.mock('./portal-context', () => ({ usePortalContext: vi.fn() }))

const mockedUseAuth = vi.mocked(useAuth)
const mockedUsePortalContext = vi.mocked(usePortalContext)
const signOut = vi.fn()
const selectUnit = vi.fn().mockResolvedValue(true)
const units = [
  { id: 'unit-a', name: 'Unidade Centro', city: 'São Paulo', state: 'SP' },
  { id: 'unit-b', name: 'Unidade Sul', city: 'Campinas', state: 'SP' },
]

function contextData(trialing = false): PortalContextData {
  return {
    user: { fullName: 'Ana Academia' }, organization: { name: 'Zion Operação' }, academy: { name: 'Academia Alfa' },
    access: {
      userStatus: 'active', commercialStatus: trialing ? 'trialing' : 'active', isTrialing: trialing,
      userUpdatedAt: '2026-09-24T10:00:00Z', commercialUpdatedAt: '2026-09-24T10:00:00Z',
    },
    unitCount: 2, units,
  }
}

function setPortal(overrides: Partial<ReturnType<typeof usePortalContext>> = {}) {
  mockedUsePortalContext.mockReturnValue({
    context: contextData(), selectedUnit: units[0], selectingUnitId: null,
    selectUnit, refresh: vi.fn(), ...overrides,
  })
}

function renderPortal(path = '/portal') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/portal" element={<PortalShell />}>
          <Route index element={<PortalHomePage />} />
          <Route path="unidades" element={<PortalUnitsPage />} />
          <Route path="perfil" element={<PortalProfilePage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('páginas do Portal da Academia', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectUnit.mockResolvedValue(true)
    mockedUseAuth.mockReturnValue({
      session: { user: { id: 'external-user', email: 'ana@academia.test' } } as never,
      status: 'authenticated', accessStatus: 'resolved', accessContext: { kind: 'academy_active', blockingReason: null },
      signIn: vi.fn(), signUpAcademy: vi.fn(), signOut, retryAccessResolution: vi.fn(),
    })
    setPortal()
  })

  it('renderiza início ativo sem indicadores operacionais fictícios', () => {
    renderPortal()
    expect(screen.getByRole('heading', { name: /Sua academia,?\s*no contexto certo/i })).toBeInTheDocument()
    expect(screen.getByText('Portal ativo')).toBeInTheDocument()
    expect(screen.getAllByText('Unidade Centro').length).toBeGreaterThan(0)
    expect(screen.queryByText(/pagamentos/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/financeiro/i)).not.toBeInTheDocument()
  })

  it('identifica período de teste sem inventar uma data final', () => {
    setPortal({ context: contextData(true) })
    renderPortal()
    expect(screen.getByText('Período de teste')).toBeInTheDocument()
    expect(screen.queryByText(/vence|expira|até \d/i)).not.toBeInTheDocument()
  })

  it('lista somente unidades autorizadas e permite troca por teclado', async () => {
    const user = userEvent.setup()
    renderPortal('/portal/unidades')
    expect(screen.getByRole('heading', { name: 'Unidades autorizadas' })).toBeInTheDocument()
    const action = screen.getByRole('button', { name: 'Acessar esta unidade' })
    action.focus()
    expect(action).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(selectUnit).toHaveBeenCalledWith('unit-b')
  })

  it('redireciona para seleção quando existem várias unidades e nenhuma está escolhida', async () => {
    setPortal({ selectedUnit: null })
    renderPortal('/portal')
    expect(await screen.findByRole('heading', { name: 'Unidades autorizadas' })).toBeInTheDocument()
  })

  it('mostra perfil mínimo e executa logout real', async () => {
    const user = userEvent.setup()
    renderPortal('/portal/perfil')
    expect(screen.getByRole('heading', { name: 'Meu perfil' })).toBeInTheDocument()
    expect(screen.getByText('ana@academia.test')).toBeInTheDocument()
    expect(screen.getByText('Zion Operação')).toBeInTheDocument()
    const logoutButtons = screen.getAllByRole('button', { name: 'Sair com segurança' })
    await user.click(logoutButtons.at(-1)!)
    expect(signOut).toHaveBeenCalledOnce()
  })

  it('mantém navegação externa separada dos módulos internos', () => {
    renderPortal()
    expect(screen.getAllByRole('navigation', { name: 'Navegação do Portal' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Início' }).length).toBeGreaterThan(0)
    expect(screen.queryByText('Estoque')).not.toBeInTheDocument()
    expect(screen.queryByText('Portal das Academias')).not.toBeInTheDocument()
  })

  it.each([
    ['pending', 'Aguardando liberação'],
    ['suspended', 'Portal suspenso'],
    ['commercial', 'Acesso indisponível'],
    ['incomplete', 'Unidade não disponível'],
    ['invalid', 'Conta sem acesso'],
  ] as const)('renderiza estado seguro %s', (variant, title) => {
    render(<MemoryRouter><PortalBlockedPage variant={variant} /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.queryByText('Unidade Centro')).not.toBeInTheDocument()
  })

  it('distingue bloqueio comercial sem revelar detalhes financeiros', () => {
    mockedUseAuth.mockReturnValue({
      ...mockedUseAuth(),
      accessContext: { kind: 'academy_suspended', blockingReason: 'commercial_access_blocked' },
    })
    render(<MemoryRouter><PortalUnavailablePage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Acesso indisponível' })).toBeInTheDocument()
    expect(screen.queryByText(/fatura|valor|vencimento/i)).not.toBeInTheDocument()
  })
})
