import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EquipmentForm } from './EquipmentForm'
import type { EquipmentFormOptions } from './types'

const options: EquipmentFormOptions = {
  clients: [
    { id: 'client-a', name: 'Academia A' },
    { id: 'client-b', name: 'Academia B' },
  ],
  locations: [
    { id: 'location-a', client_id: 'client-a', name: 'Matriz A', city: 'Curitiba', state: 'PR' },
    { id: 'location-b', client_id: 'client-b', name: 'Matriz B', city: 'São Paulo', state: 'SP' },
  ],
  categories: ['Cardio'],
}

describe('EquipmentForm', () => {
  it('mostra validações e não envia um equipamento inválido', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<EquipmentForm options={options} submitLabel="Cadastrar equipamento" onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: /Cadastrar equipamento/ }))

    expect(screen.getByText('Selecione o cliente responsável pelo equipamento.')).toBeInTheDocument()
    expect(screen.getByText('Informe um nome com pelo menos 2 caracteres.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('mantém disponíveis apenas unidades do cliente selecionado', async () => {
    const user = userEvent.setup()
    render(<EquipmentForm options={options} submitLabel="Cadastrar equipamento" onSubmit={vi.fn()} />)

    const clientSelect = screen.getByLabelText(/Cliente/)
    const locationSelect = screen.getByLabelText('Unidade')
    await user.selectOptions(clientSelect, 'client-a')
    await user.selectOptions(locationSelect, 'location-a')
    expect(locationSelect).toHaveValue('location-a')

    await user.selectOptions(clientSelect, 'client-b')
    expect(locationSelect).toHaveValue('')
    expect(screen.queryByRole('option', { name: /Matriz A/ })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Matriz B/ })).toBeInTheDocument()
  })

  it('envia os dados válidos preenchidos', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<EquipmentForm options={options} submitLabel="Cadastrar equipamento" onSubmit={onSubmit} />)

    await user.selectOptions(screen.getByLabelText(/Cliente/), 'client-a')
    await user.selectOptions(screen.getByLabelText('Unidade'), 'location-a')
    await user.type(screen.getByLabelText(/Nome do equipamento/), 'Esteira Performance 01')
    await user.type(screen.getByLabelText(/Categoria/), 'Cardio')
    await user.type(screen.getByLabelText('Marca'), 'Movement')
    await user.click(screen.getByRole('button', { name: /Cadastrar equipamento/ }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      client_id: 'client-a',
      client_location_id: 'location-a',
      name: 'Esteira Performance 01',
      category: 'Cardio',
      brand: 'Movement',
      status: 'operational',
    }))
  })
})
