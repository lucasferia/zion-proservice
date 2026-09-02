import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { DashboardContent } from './DashboardPage'
import type { OperationalDashboard } from './types'

function dashboard(overrides: Partial<OperationalDashboard> = {}): OperationalDashboard {
  return {
    period_start: '2026-09-01',
    period_end: '2026-09-30',
    timezone_name: 'America/Sao_Paulo',
    completed_maintenances: 0,
    in_progress_maintenances: 0,
    active_clients: 0,
    received_revenue: 0,
    overdue_returns: 0,
    today_returns: 0,
    next_7_returns: 0,
    inventory_attention: 0,
    inventory_critical: 0,
    inventory_out_of_stock: 0,
    priority_returns: [],
    priority_maintenances: [],
    priority_inventory: [],
    latest_completed_maintenances: [],
    upcoming_returns: [],
    is_new_organization: false,
    ...overrides,
  }
}

function renderContent(data: OperationalDashboard) {
  return render(<MemoryRouter><DashboardContent data={data} /></MemoryRouter>)
}

describe('DashboardContent', () => {
  it('explica de forma objetiva por que uma organização nova está zerada', () => {
    renderContent(dashboard({ is_new_organization: true }))

    expect(screen.getByRole('heading', { name: /indicadores estão zerados/i })).toBeInTheDocument()
    expect(screen.getByText(/ainda não há operação registrada/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cadastrar cliente' })).toHaveAttribute('href', '/app/clientes/novo')
  })

  it('renderiza indicadores reais e diferencia faturamento recebido', () => {
    renderContent(dashboard({
      completed_maintenances: 12,
      in_progress_maintenances: 3,
      active_clients: 8,
      received_revenue: 1540.5,
      overdue_returns: 2,
      today_returns: 1,
      next_7_returns: 4,
      inventory_attention: 3,
      inventory_critical: 1,
      inventory_out_of_stock: 2,
    }))

    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('R$ 1.540,50')).toBeInTheDocument()
    expect(screen.getByText('somente received por paid_at')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
  })

  it('mostra estados vazios independentes para cada fila operacional', () => {
    renderContent(dashboard())

    expect(screen.getByText('Nenhum retorno vencido ou previsto para hoje.')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma ordem de serviço está em andamento.')).toBeInTheDocument()
    expect(screen.getByText('Nenhum item está crítico ou sem saldo.')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma manutenção foi concluída no período selecionado.')).toBeInTheDocument()
    expect(screen.getByText('Nenhum retorno futuro está pendente.')).toBeInTheDocument()
  })

  it('renderiza prioridades acionáveis com links para os registros', () => {
    renderContent(dashboard({
      priority_returns: [{ id: 'return-1', scheduled_date: '2026-09-01', client_id: 'client-1', client_name: 'Academia Zion', equipment_id: 'equipment-1', equipment_name: 'Esteira 01', location_name: 'Matriz', days_overdue: 0, timing: 'today' }],
      priority_maintenances: [{ id: 'maintenance-1', work_order_number: 'OS-001', scheduled_at: '2026-09-01T13:00:00Z', client_id: 'client-1', client_name: 'Academia Zion', equipment_id: 'equipment-1', equipment_name: 'Esteira 01', maintenance_type: 'preventive' }],
      priority_inventory: [{ id: 'item-1', name: 'Correia', sku: 'CR-01', unit_of_measure: 'un', current_quantity: 0, minimum_stock: 2, situation: 'out_of_stock' }],
    }))

    expect(screen.getByText('Academia Zion')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /OS-001/ })).toHaveAttribute('href', '/app/manutencoes/maintenance-1')
    expect(screen.getByRole('link', { name: /Correia/ })).toHaveAttribute('href', '/app/estoque/item-1')
  })
})
