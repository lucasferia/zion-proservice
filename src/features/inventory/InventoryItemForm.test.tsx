import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InventoryItemForm } from './InventoryItemForm'

const options = { categories: ['Transmissão'], units: ['unidade'], suppliers: [{ id: 'supplier-1', name: 'Peças Zion' }] }

describe('InventoryItemForm', () => {
  it('mostra validações e não envia item inválido', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<InventoryItemForm options={options} submitLabel="Cadastrar item" onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: /Cadastrar item/ }))
    expect(screen.getByText('Informe um nome com pelo menos 2 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Informe a unidade de medida.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('envia item válido sem permitir saldo inicial direto', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<InventoryItemForm options={options} submitLabel="Cadastrar item" onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText(/Nome do item/), 'Correia RT 250')
    await user.type(screen.getByLabelText('SKU'), 'COR-250')
    await user.type(screen.getByLabelText(/Unidade de medida/), 'unidade')
    await user.selectOptions(screen.getByLabelText('Fornecedor'), 'supplier-1')
    await user.click(screen.getByRole('button', { name: /Cadastrar item/ }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Correia RT 250',
      sku: 'COR-250',
      unit_of_measure: 'unidade',
      minimum_stock: '0',
      supplier_id: 'supplier-1',
    }))
    expect(screen.queryByLabelText(/saldo atual/i)).not.toBeInTheDocument()
  })
})
