import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MaintenanceFinancialSection } from './MaintenanceFinancialSection'
import { useMaintenancePayments } from './paymentQueries'

vi.mock('./paymentQueries', async () => {
  const actual = await vi.importActual<typeof import('./paymentQueries')>('./paymentQueries')
  return { ...actual, useMaintenancePayments: vi.fn() }
})
vi.mock('./paymentApi', () => ({ receivePayment: vi.fn(), cancelPayment: vi.fn() }))

function renderSection(status = 'completed') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}><MemoryRouter><MaintenanceFinancialSection organizationId="org-1" maintenanceId="maintenance-1" maintenanceStatus={status} /></MemoryRouter></QueryClientProvider>)
}

describe('MaintenanceFinancialSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useMaintenancePayments).mockReturnValue({
      data: {
        summary: { maintenance_total: 1000, active_total: 400, received_total: 300, pending_total: 100, balance_amount: 700 },
        payments: [],
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMaintenancePayments>)
  })

  it('distingue valor da OS, recebido e saldo', () => {
    renderSection()
    expect(screen.getByText(/1\.000,00/)).toBeInTheDocument()
    expect(screen.getByText(/300,00/)).toBeInTheDocument()
    expect(screen.getByText(/700,00/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Registrar pagamento/ })).toHaveAttribute('href', '/app/manutencoes/maintenance-1/pagamentos/novo')
  })

  it('não oferece novo pagamento para manutenção cancelada', () => {
    renderSection('cancelled')
    expect(screen.queryByRole('link', { name: /Registrar pagamento/ })).not.toBeInTheDocument()
  })
})
