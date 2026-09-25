import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../auth/auth-context'
import { getPortalContext, PortalAuthorizationError } from './portalApi'
import { PortalContextProvider } from './PortalContext'
import { portalContextKeys, usePortalContext } from './portal-context'
import { getPortalUnitPreferenceKey } from './portalPreferences'
import type { PortalContextData } from './types'

vi.mock('../auth/auth-context', () => ({ useAuth: vi.fn() }))
vi.mock('./portalApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('./portalApi')>()
  return { ...original, getPortalContext: vi.fn() }
})

const mockedUseAuth = vi.mocked(useAuth)
const mockedGetPortalContext = vi.mocked(getPortalContext)
const retryAccessResolution = vi.fn()

const units = [
  { id: 'unit-a', name: 'Unidade Centro', city: 'São Paulo', state: 'SP' },
  { id: 'unit-b', name: 'Unidade Sul', city: 'Campinas', state: 'SP' },
]

function makeContext(authorizedUnits = units): PortalContextData {
  return {
    user: { fullName: 'Ana Academia' },
    organization: { name: 'Zion Operação' },
    academy: { name: 'Academia Alfa' },
    access: {
      userStatus: 'active', commercialStatus: 'active', isTrialing: false,
      userUpdatedAt: '2026-09-24T10:00:00Z', commercialUpdatedAt: '2026-09-24T10:00:00Z',
    },
    unitCount: authorizedUnits.length,
    units: authorizedUnits,
  }
}

function Probe() {
  const portal = usePortalContext()
  return (
    <div>
      <span>{portal.selectedUnit?.name ?? 'sem-unidade'}</span>
      <button type="button" onClick={() => void portal.selectUnit('unit-b')}>Selecionar Sul</button>
    </div>
  )
}

function renderProvider(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return {
    client,
    ...render(<QueryClientProvider client={client}><PortalContextProvider><Probe /></PortalContextProvider></QueryClientProvider>),
  }
}

describe('PortalContextProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    mockedUseAuth.mockReturnValue({
      session: { user: { id: 'external-user' } } as never,
      status: 'authenticated', accessStatus: 'resolved',
      accessContext: { kind: 'academy_active', blockingReason: null },
      signIn: vi.fn(), signUpAcademy: vi.fn(), signOut: vi.fn(), retryAccessResolution,
    })
  })

  it('seleciona automaticamente quando existe uma única unidade', async () => {
    mockedGetPortalContext.mockResolvedValue(makeContext([units[0]]))
    renderProvider()
    expect(await screen.findByText('Unidade Centro')).toBeInTheDocument()
    expect(window.localStorage.getItem(getPortalUnitPreferenceKey('external-user'))).toBe('unit-a')
  })

  it('solicita escolha quando existem várias unidades e troca após revalidar', async () => {
    const user = userEvent.setup()
    mockedGetPortalContext.mockResolvedValue(makeContext())
    renderProvider()
    expect(await screen.findByText('sem-unidade')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Selecionar Sul' }))
    expect(await screen.findByText('Unidade Sul')).toBeInTheDocument()
    expect(mockedGetPortalContext).toHaveBeenCalledTimes(2)
    expect(window.localStorage.getItem(getPortalUnitPreferenceKey('external-user'))).toBe('unit-b')
  })

  it('restaura preferência válida e descarta preferência revogada', async () => {
    window.localStorage.setItem(getPortalUnitPreferenceKey('external-user'), 'unit-b')
    mockedGetPortalContext.mockResolvedValueOnce(makeContext()).mockResolvedValueOnce(makeContext([units[0]]))
    const { client } = renderProvider()
    expect(await screen.findByText('Unidade Sul')).toBeInTheDocument()

    await act(async () => {
      await client.invalidateQueries({ queryKey: portalContextKeys.user('external-user') })
    })
    expect(await screen.findByText('Unidade Centro')).toBeInTheDocument()
    expect(window.localStorage.getItem(getPortalUnitPreferenceKey('external-user'))).toBe('unit-a')
  })

  it('exibe loading e erro recuperável sem manter conteúdo anterior', async () => {
    mockedGetPortalContext.mockRejectedValue(new Error('offline'))
    renderProvider()
    expect(screen.getByText('Atualizando seu acesso ao Portal')).toBeInTheDocument()
    expect(await screen.findByRole('alert', {}, { timeout: 2_500 })).toHaveTextContent('Não foi possível carregar o Portal')
    expect(screen.queryByText('Unidade Centro')).not.toBeInTheDocument()
  })

  it('não restaura contexto em cache de outro usuário', async () => {
    mockedGetPortalContext.mockResolvedValue(makeContext([units[0]]))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(portalContextKeys.user('other-user'), makeContext([units[1]]))
    renderProvider(client)
    await waitFor(() => expect(screen.getByText('Unidade Centro')).toBeInTheDocument())
    expect(screen.queryByText('Unidade Sul')).not.toBeInTheDocument()
  })

  it('remove o contexto protegido e revalida o acesso apos erro de autorizacao', async () => {
    window.localStorage.setItem(getPortalUnitPreferenceKey('external-user'), 'unit-a')
    mockedGetPortalContext.mockRejectedValue(new PortalAuthorizationError())
    renderProvider()

    expect(screen.getByText('Atualizando seu acesso ao Portal')).toBeInTheDocument()
    await waitFor(() => expect(retryAccessResolution).toHaveBeenCalledOnce())
    expect(window.localStorage.getItem(getPortalUnitPreferenceKey('external-user'))).toBeNull()
    expect(screen.queryByText('Unidade Centro')).not.toBeInTheDocument()
  })
})
