import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MaintenancePartsEditor } from './MaintenancePartsEditor'
import type { MaintenanceInventoryOption } from './types'

const inventory: MaintenanceInventoryOption[] = [{
  id: 'item-a',
  name: 'Correia RT 250',
  sku: 'COR-250',
  unit_of_measure: 'unidade',
  current_quantity: 3,
  average_unit_cost: 45,
}]

describe('MaintenancePartsEditor', () => {
  it('bloqueia quantidade maior que o saldo disponível', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    render(<MaintenancePartsEditor parts={[]} inventory={inventory} onAdd={onAdd} onUpdate={vi.fn()} onRemove={vi.fn()} />)

    await user.selectOptions(screen.getByLabelText('Item do estoque'), 'item-a')
    const quantity = screen.getByLabelText(/^Quantidade/)
    await user.clear(quantity)
    await user.type(quantity, '4')
    await user.click(screen.getByRole('button', { name: 'Adicionar peça' }))

    expect(screen.getByText(/Saldo disponível: 3/)).toBeInTheDocument()
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('adiciona uma peça com quantidade válida', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn().mockResolvedValue(undefined)
    render(<MaintenancePartsEditor parts={[]} inventory={inventory} onAdd={onAdd} onUpdate={vi.fn()} onRemove={vi.fn()} />)

    await user.selectOptions(screen.getByLabelText('Item do estoque'), 'item-a')
    await user.click(screen.getByRole('button', { name: 'Adicionar peça' }))
    expect(onAdd).toHaveBeenCalledWith({ inventory_item_id: 'item-a', quantity: '1' })
  })
})
