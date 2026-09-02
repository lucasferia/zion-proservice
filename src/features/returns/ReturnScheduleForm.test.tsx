import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReturnScheduleForm } from './ReturnScheduleForm'
import type { ReturnScheduleOptions } from './types'

const options: ReturnScheduleOptions = {
  clients: [{ id: 'client-a', name: 'Academia A' }, { id: 'client-b', name: 'Academia B' }],
  locations: [
    { id: 'location-a', client_id: 'client-a', name: 'Matriz A', city: 'Curitiba', state: 'PR' },
    { id: 'location-b', client_id: 'client-b', name: 'Matriz B', city: 'São Paulo', state: 'SP' },
  ],
  equipment: [
    { id: 'equipment-a', client_id: 'client-a', client_location_id: 'location-a', name: 'Esteira A', category: 'Cardio' },
    { id: 'equipment-b', client_id: 'client-b', client_location_id: 'location-b', name: 'Bike B', category: 'Cardio' },
  ],
  cities: ['Curitiba', 'São Paulo'],
}

describe('ReturnScheduleForm', () => {
  it('exibe validações claras antes da confirmação', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ReturnScheduleForm options={options} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: /Revisar agendamento/ }))

    expect(screen.getByText('Selecione o cliente.')).toBeInTheDocument()
    expect(screen.getByText('Selecione um equipamento ativo.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('mantém unidade e cliente sincronizados com o equipamento', async () => {
    const user = userEvent.setup()
    render(<ReturnScheduleForm options={options} onSubmit={vi.fn()} />)

    await user.selectOptions(screen.getByLabelText(/Cliente/), 'client-a')
    expect(screen.queryByRole('option', { name: /Bike B/ })).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText(/Equipamento/), 'equipment-a')

    expect(screen.getByText(/Matriz A · Curitiba\/PR/)).toBeInTheDocument()
  })

  it('revisa e confirma um retorno válido', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<ReturnScheduleForm options={options} onSubmit={onSubmit} />)

    await user.selectOptions(screen.getByLabelText(/Cliente/), 'client-a')
    await user.selectOptions(screen.getByLabelText(/Equipamento/), 'equipment-a')
    await user.type(screen.getByLabelText(/Orientações/), 'Revisar correia')
    await user.click(screen.getByRole('button', { name: /Revisar agendamento/ }))
    await user.click(screen.getByRole('button', { name: 'Confirmar retorno' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      client_id: 'client-a',
      client_location_id: 'location-a',
      equipment_id: 'equipment-a',
      notes: 'Revisar correia',
    }))
  })
})
