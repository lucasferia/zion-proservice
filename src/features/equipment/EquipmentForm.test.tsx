import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EquipmentForm } from './EquipmentForm'
import type { EquipmentFormOptions } from './types'

const options: EquipmentFormOptions = { categories: ['Cardio'] }

describe('EquipmentForm', () => {
  it('mostra validações e não envia um equipamento inválido', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<EquipmentForm options={options} submitLabel="Cadastrar equipamento" onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: /Cadastrar equipamento/ }))

    expect(screen.getByText('Informe um nome com pelo menos 2 caracteres.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('não solicita cliente nem unidade no cadastro geral', () => {
    render(<EquipmentForm options={options} submitLabel="Cadastrar equipamento" onSubmit={vi.fn()} />)

    expect(screen.queryByLabelText(/Cliente/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Unidade')).not.toBeInTheDocument()
    expect(screen.getByText(/cadastro geral da organização/i)).toBeInTheDocument()
  })

  it('envia os dados gerais válidos preenchidos', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<EquipmentForm options={options} submitLabel="Cadastrar equipamento" onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/Nome do equipamento/), 'Esteira Performance 01')
    await user.type(screen.getByLabelText(/Categoria/), 'Cardio')
    await user.type(screen.getByLabelText('Marca'), 'Movement')
    await user.click(screen.getByRole('button', { name: /Cadastrar equipamento/ }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Esteira Performance 01',
      category: 'Cardio',
      brand: 'Movement',
      status: 'operational',
    }))
  })
})
