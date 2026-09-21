import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CalendarEventForm } from './CalendarEventForm'
import type { CalendarEventOptions } from './types'

const options: CalendarEventOptions = {
  canManage: true,
  clients: [{ id: 'client-a', name: 'Cliente A' }],
  locations: [{ id: 'location-a', client_id: 'client-a', name: 'Matriz', city: 'Curitiba', state: 'PR' }],
  equipment: [{ id: 'equipment-a', name: 'Esteira', category: 'Cardio' }],
  maintenances: [{ id: 'maintenance-a', work_order_number: 'OS-001', client_id: 'client-a', client_location_id: 'location-a', equipment_id: 'equipment-a', status: 'draft' }],
  cities: ['Curitiba'],
}

describe('CalendarEventForm', () => {
  it('impede envio sem título', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<CalendarEventForm options={options} submitLabel="Criar evento" onCancel={vi.fn()} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: 'Criar evento' }))
    expect(screen.getByText(/título com pelo menos 2/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('permite evento de dia inteiro sem vínculos', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<CalendarEventForm options={options} submitLabel="Criar evento" onCancel={vi.fn()} onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText(/Título/), 'Lembrete interno')
    await user.click(screen.getByRole('checkbox', { name: /Dia inteiro/ }))
    await user.click(screen.getByRole('button', { name: 'Criar evento' }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Lembrete interno', is_all_day: true, client_id: '', maintenance_id: '' }))
  })

  it('preenche vínculos coerentes ao selecionar uma OS', async () => {
    const user = userEvent.setup()
    render(<CalendarEventForm options={options} submitLabel="Criar evento" onCancel={vi.fn()} onSubmit={vi.fn()} />)
    await user.selectOptions(screen.getByLabelText(/Ordem de serviço/), 'maintenance-a')
    expect(screen.getByLabelText('Cliente')).toHaveValue('client-a')
    expect(screen.getByLabelText('Unidade')).toHaveValue('location-a')
    expect(screen.getByLabelText('Equipamento')).toHaveValue('equipment-a')
  })

  it('edita os valores recebidos e persiste o formulário atualizado', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<CalendarEventForm options={options} submitLabel="Salvar alterações" onCancel={vi.fn()} onSubmit={onSubmit} initialValue={{
      title: 'Título anterior', description: '', event_type: 'meeting', is_all_day: true,
      event_date: '2026-09-25', starts_at: '', ends_at: '', client_id: '', client_location_id: '',
      equipment_id: '', maintenance_id: '',
    }} />)
    const title = screen.getByLabelText(/Título/)
    await user.clear(title)
    await user.type(title, 'Título atualizado')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Título atualizado', event_type: 'meeting', event_date: '2026-09-25' }))
  })
})
