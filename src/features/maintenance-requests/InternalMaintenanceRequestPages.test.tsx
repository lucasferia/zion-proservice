import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InternalMaintenanceRequestDetailsPage } from './InternalMaintenanceRequestPages'

const state = vi.hoisted(() => ({ role: 'internal_owner', status: 'pending' }))

vi.mock('../auth/auth-context', () => ({ useAuth: () => ({ accessContext: { kind: state.role } }) }))
vi.mock('./maintenanceRequestQueries', () => ({
  requestKeys: { internal: () => ['maintenance-requests', 'internal'] },
  useInternalRequestDetails: () => ({
    organization: { data: 'org-a', isLoading: false, error: null },
    query: { isLoading: false, error: null, refetch: vi.fn(), data: { photos: [], request: {
      id: 'request-a', title: 'Ruído na esteira', description: 'Ruído contínuo relatado pela academia.',
      reported_criticality: 'critical', technical_priority: state.status === 'pending' ? null : 'high', status: state.status,
      equipment_id: 'equipment-a', equipment_name: 'Esteira 01', equipment_category: 'Cardio', client_name: 'Academia A',
      location_name: 'Unidade Centro', requester_name: 'Gestora', requester_email: 'gestora@example.test', created_at: '2026-09-30T12:00:00Z',
      cancellation_reason: null, cancelled_at: null, public_response: null, internal_decision_note: null,
      decided_at: state.status === 'pending' ? null : '2026-09-30T13:00:00Z', decided_by_name: 'Owner', converted_at: null,
      converted_by_name: null, maintenance_id: null, work_order_number: null,
    } } },
  }),
}))
vi.mock('../maintenances/maintenanceQueries', () => ({ useMaintenanceFormOptions: () => ({ options: { isLoading: false, data: { technicians: [] } } }) }))
vi.mock('./maintenanceRequestApi', () => ({ approveInternalMaintenanceRequest: vi.fn(), rejectInternalMaintenanceRequest: vi.fn(), convertInternalMaintenanceRequest: vi.fn() }))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={['/app/solicitacoes/request-a']}><Routes><Route path="/app/solicitacoes/:requestId" element={<InternalMaintenanceRequestDetailsPage />} /></Routes></MemoryRouter></QueryClientProvider>)
}

describe('decisão interna de solicitações', () => {
  beforeEach(() => { state.role = 'internal_owner'; state.status = 'pending' })

  it('oferece aprovação e rejeição somente ao owner quando pendente', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rejeitar' })).toBeInTheDocument()
  })

  it('mantém technician em modo de leitura', () => {
    state.role = 'internal_technician'
    renderPage()
    expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument()
    expect(screen.getByText('Acesso técnico')).toBeInTheDocument()
  })

  it('só oferece conversão depois da aprovação', () => {
    state.status = 'approved'
    renderPage()
    expect(screen.getByRole('button', { name: 'Preparar conversão' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rejeitar' })).not.toBeInTheDocument()
  })

  it('abre o diálogo pelo teclado, fecha com Escape e devolve o foco ao acionador', async () => {
    const user = userEvent.setup()
    renderPage()
    const approve = screen.getByRole('button', { name: 'Aprovar' })
    approve.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('dialog', { name: 'Aprovar solicitação' })).toBeInTheDocument()
    const priority = screen.getByRole('combobox', { name: 'Prioridade técnica *' })
    const confirm = screen.getByRole('button', { name: 'Confirmar' })
    expect(priority).toHaveFocus()
    await user.tab({ shift: true })
    expect(confirm).toHaveFocus()
    await user.tab()
    expect(priority).toHaveFocus()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(approve).toHaveFocus())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
