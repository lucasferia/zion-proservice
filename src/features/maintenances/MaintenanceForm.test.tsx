import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { datePlusDays } from '../returns/formatters'
import { MaintenanceForm } from './MaintenanceForm'
import type { MaintenanceFormOptions, MaintenanceInput } from './types'

const options: MaintenanceFormOptions = {
  clients: [{ id: 'client-a', name: 'Academia Atlas' }, { id: 'client-b', name: 'Clube Orion' }],
  locations: [{ id: 'location-a', client_id: 'client-a', name: 'Matriz', city: 'Curitiba', state: 'PR' }],
  equipment: [
    { id: 'equipment-a', name: 'Esteira 01', category: 'Cardio', status: 'operational' },
    { id: 'equipment-b', name: 'Bike 02', category: 'Cardio', status: 'operational' },
  ],
  inventory: [],
  technicians: [{ user_id: 'user-a', full_name: 'Técnico A', role: 'technician' }],
}

const initialValue: MaintenanceInput = {
  client_id: '', client_location_id: '', equipment_id: '', maintenance_type: 'preventive',
  status: 'draft', scheduled_at: '2026-09-02T14:00', next_return_date: datePlusDays(30),
  diagnosis: '', service_performed: '', notes: '', responsible_technician_id: 'user-a', total_amount: '0',
}

describe('MaintenanceForm', () => {
  it('mantém equipamento independente e filtra somente as unidades pelo cliente', async () => {
    const user = userEvent.setup()
    render(<MaintenanceForm options={options} initialValue={initialValue} submitLabel="Criar OS" onSubmit={vi.fn()} />)

    expect(screen.getByRole('option', { name: /Bike 02/ })).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(/Cliente/), 'client-a')
    await user.selectOptions(screen.getByLabelText(/Unidade visitada/), 'location-a')
    await user.selectOptions(screen.getByLabelText(/Equipamento/), 'equipment-b')

    expect(screen.getByLabelText(/Unidade visitada/)).toHaveValue('location-a')
    expect(screen.getByLabelText(/Equipamento/)).toHaveValue('equipment-b')
  })

  it('não envia sem cliente, equipamento e reagendamento', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<MaintenanceForm options={options} initialValue={{ ...initialValue, next_return_date: '' }} submitLabel="Criar OS" onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: /Criar OS/ }))
    expect(screen.getByText('Selecione um cliente.')).toBeInTheDocument()
    expect(screen.getByText('Selecione o equipamento atendido.')).toBeInTheDocument()
    expect(screen.getByText('Informe a data de reagendamento.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('envia contexto da visita, equipamento geral e relatório', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<MaintenanceForm options={options} initialValue={initialValue} submitLabel="Criar OS" onSubmit={onSubmit} />)

    await user.selectOptions(screen.getByLabelText(/Cliente/), 'client-a')
    await user.selectOptions(screen.getByLabelText(/Unidade visitada/), 'location-a')
    await user.selectOptions(screen.getByLabelText(/Equipamento/), 'equipment-b')
    await user.type(screen.getByLabelText('Diagnóstico'), 'Ruído no rolete')
    await user.type(screen.getByLabelText('Serviço realizado'), 'Ajuste e lubrificação')
    await user.click(screen.getByRole('button', { name: /Criar OS/ }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      client_id: 'client-a', client_location_id: 'location-a', equipment_id: 'equipment-b',
      next_return_date: initialValue.next_return_date,
    }))
  })
})
