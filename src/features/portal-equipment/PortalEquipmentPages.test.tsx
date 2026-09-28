import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '../auth/auth-context'
import { usePortalContext } from '../portal/portal-context'
import { PortalAuthorizationError } from '../portal/portalApi'
import { createPortalEquipment, PortalEquipmentNotFoundError } from './portalEquipmentApi'
import { usePortalEquipmentDetails, usePortalEquipmentList } from './portalEquipmentQueries'
import { CreatePortalEquipmentPage, PortalEquipmentDetailsPage, PortalEquipmentListPage } from './PortalEquipmentPages'

vi.mock('../auth/auth-context', () => ({ useAuth: vi.fn() }))
vi.mock('../portal/portal-context', () => ({ usePortalContext: vi.fn() }))
vi.mock('./portalEquipmentQueries', () => ({
  portalEquipmentKeys: { all: ['portal-equipment'], lists: () => ['portal-equipment', 'list'] },
  usePortalEquipmentList: vi.fn(), usePortalEquipmentDetails: vi.fn(),
}))
vi.mock('./portalEquipmentApi', async (importOriginal) => {
  const original = await importOriginal<typeof import('./portalEquipmentApi')>()
  return { ...original, createPortalEquipment: vi.fn() }
})

const mockedList = vi.mocked(usePortalEquipmentList)
const mockedDetails = vi.mocked(usePortalEquipmentDetails)
const mockedPortal = vi.mocked(usePortalContext)
const mockedAuth = vi.mocked(useAuth)
const mockedCreate = vi.mocked(createPortalEquipment)
const refresh = vi.fn().mockResolvedValue(undefined)
const unit = { id: 'unit-a', name: 'Unidade Centro', city: 'São Paulo', state: 'SP' }

function queryState<T>(data?: T, error: Error | null = null, isLoading = false) {
  return { data, error, isLoading, isFetching: false, refetch: vi.fn() } as never
}

describe('equipamentos no Portal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAuth.mockReturnValue({ session: { user: { id: 'academy-user' } } } as never)
    mockedPortal.mockReturnValue({ context: {} as never, selectedUnit: unit, selectingUnitId: null, selectUnit: vi.fn(), refresh })
  })

  it('lista, busca e pagina somente o resultado da unidade ativa', async () => {
    const user = userEvent.setup()
    mockedList.mockReturnValue({
      selectedUnit: unit, deferredSearch: '', query: queryState({ items: [{
        id: 'equipment-a', name: 'Esteira 01', category: 'Cardio', brand: 'Zion', model: 'Run',
        serial_number: 'SER-1', asset_tag: 'PAT-1', status: 'operational', created_at: '2026-09-26T12:00:00Z',
        location_name: 'Unidade Centro', total_count: 13,
      }], total: 13, page: 1, pageSize: 12, pageCount: 2 }),
    } as never)
    render(<MemoryRouter><PortalEquipmentListPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Equipamentos' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Esteira 01/ })).toHaveAttribute('href', '/portal/equipamentos/equipment-a')
    await user.type(screen.getByRole('searchbox'), 'Run')
    expect(screen.getByRole('button', { name: /Próxima/ })).toBeEnabled()
  })

  it('cobre loading, vazio e erro recuperável', () => {
    mockedList.mockReturnValue({ selectedUnit: unit, deferredSearch: '', query: queryState(undefined, null, true) } as never)
    const view = render(<MemoryRouter><PortalEquipmentListPage /></MemoryRouter>)
    expect(screen.getByLabelText('Carregando conteúdo')).toBeInTheDocument()
    mockedList.mockReturnValue({ selectedUnit: unit, deferredSearch: '', query: queryState({ items: [], total: 0, page: 1, pageSize: 12, pageCount: 1 }) } as never)
    view.rerender(<MemoryRouter><PortalEquipmentListPage /></MemoryRouter>)
    expect(screen.getByText('Nenhum equipamento nesta unidade')).toBeInTheDocument()
    mockedList.mockReturnValue({ selectedUnit: unit, deferredSearch: '', query: queryState(undefined, new Error('Falha segura')) } as never)
    view.rerender(<MemoryRouter><PortalEquipmentListPage /></MemoryRouter>)
    expect(screen.getByRole('alert')).toHaveTextContent('Falha segura')
  })

  it('revalida o contexto e remove conteúdo quando a autorização é revogada', () => {
    mockedList.mockReturnValue({ selectedUnit: unit, deferredSearch: '', query: queryState(undefined, new PortalAuthorizationError()) } as never)
    render(<MemoryRouter><PortalEquipmentListPage /></MemoryRouter>)
    expect(refresh).toHaveBeenCalledOnce()
    expect(screen.queryByText('Esteira 01')).not.toBeInTheDocument()
  })

  it('mostra detalhe mínimo e estado seguro para UUID sem acesso', () => {
    mockedDetails.mockReturnValue({ selectedUnit: unit, query: queryState(undefined, new PortalEquipmentNotFoundError()) } as never)
    render(<MemoryRouter initialEntries={['/portal/equipamentos/forged']}><Routes><Route path="/portal/equipamentos/:equipmentId" element={<PortalEquipmentDetailsPage />} /></Routes></MemoryRouter>)
    expect(screen.getByText('Equipamento indisponível')).toBeInTheDocument()
    expect(screen.queryByText(/pagamento|estoque|custo/i)).not.toBeInTheDocument()
  })

  it('cadastra usando a unidade ativa e navega para o registro criado', async () => {
    const user = userEvent.setup()
    mockedCreate.mockResolvedValue('new-equipment')
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/portal/equipamentos/novo']}><Routes><Route path="/portal/equipamentos/novo" element={<CreatePortalEquipmentPage />} /><Route path="/portal/equipamentos/:equipmentId" element={<div>Detalhe criado</div>} /></Routes></MemoryRouter></QueryClientProvider>)
    await user.type(screen.getByLabelText(/Nome do equipamento/), 'Bicicleta 02')
    await user.type(screen.getByLabelText(/Categoria/), 'Bike')
    await user.click(screen.getByRole('button', { name: /Cadastrar equipamento/ }))
    expect(mockedCreate).toHaveBeenCalledWith('unit-a', expect.objectContaining({ name: 'Bicicleta 02' }))
    expect(await screen.findByText('Detalhe criado')).toBeInTheDocument()
  })
})
