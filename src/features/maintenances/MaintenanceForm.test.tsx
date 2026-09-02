import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MaintenanceForm } from './MaintenanceForm'
import type { MaintenanceFormOptions, MaintenanceInput } from './types'

const options: MaintenanceFormOptions = {
  clients: [
    { id: 'client-a', name: 'Academia Atlas' },
    { id: 'client-b', name: 'Clube Orion' },
  ],
  locations: [
    { id: 'location-a', client_id: 'client-a', name: 'Matriz', city: 'Curitiba', state: 'PR' },
  ],
  equipment: [
    { id: 'equipment-a', client_id: 'client-a', client_location_id: 'location-a', name: 'Esteira 01', category: 'Cardio', status: 'operational' },
    { id: 'equipment-b', client_id: 'client-b', client_location_id: null, name: 'Bike 02', category: 'Cardio', status: 'operational' },
  ],
  inventory: [],
  technicians: [{ user_id: 'user-a', full_name: 'Técnico A', role: 'technician' }],
}

const initialValue: MaintenanceInput = {
  client_id: '',
  client_location_id: '',
  equipment_id: '',
  maintenance_type: 'preventive',
  status: 'draft',
  scheduled_at: '2026-08-31T14:00',
  diagnosis: '',
  service_performed: '',
  notes: '',
  responsible_technician_id: 'user-a',
  total_amount: '0',
}

describe('MaintenanceForm', () => {
  it('filtra equipamentos e deriva a unidade do equipamento escolhido', async () => {
    const user = userEvent.setup()
    render(<MaintenanceForm options={options} initialValue={initialValue} submitLabel="Criar OS" onSubmit={vi.fn()} />)

    await user.selectOptions(screen.getByLabelText(/Cliente/), 'client-a')
    expect(screen.getByRole('option', { name: /Esteira 01/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Bike 02/ })).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/Equipamento/), 'equipment-a')
    expect(screen.getByLabelText('Unidade vinculada')).toHaveValue('Matriz · Curitiba/PR')
  })

  it('não envia sem cliente e equipamento', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<MaintenanceForm options={options} initialValue={initialValue} submitLabel="Criar OS" onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: /Criar OS/ }))
    expect(screen.getByText('Selecione um cliente.')).toBeInTheDocument()
    expect(screen.getByText('Selecione o equipamento atendido.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('envia os vínculos coerentes e o registro técnico', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<MaintenanceForm options={options} initialValue={initialValue} submitLabel="Criar OS" onSubmit={onSubmit} />)

    await user.selectOptions(screen.getByLabelText(/Cliente/), 'client-a')
    await user.selectOptions(screen.getByLabelText(/Equipamento/), 'equipment-a')
    await user.type(screen.getByLabelText('Diagnóstico'), 'Ruído no rolete')
    await user.type(screen.getByLabelText('Serviço realizado'), 'Ajuste e lubrificação')
    await user.click(screen.getByRole('button', { name: /Criar OS/ }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      client_id: 'client-a',
      client_location_id: 'location-a',
      equipment_id: 'equipment-a',
      diagnosis: 'Ruído no rolete',
      service_performed: 'Ajuste e lubrificação',
    }))
  })
})
