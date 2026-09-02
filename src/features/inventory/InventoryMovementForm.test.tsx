import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InventoryMovementForm } from './InventoryMovementForm'
import type { InventoryItemDetails } from './types'

const item: InventoryItemDetails = {
  id: 'item-a',
  organization_id: 'org-a',
  name: 'Correia RT 250',
  sku: 'COR-250',
  category: 'Transmissão',
  unit_of_measure: 'unidade',
  current_quantity: 10,
  minimum_stock: 2,
  average_unit_cost: 45,
  status: 'active',
  notes: null,
  stock_situation: 'normal',
  created_at: '2026-08-26T12:00:00Z',
  updated_at: '2026-08-26T12:00:00Z',
  movements: [],
}

describe('InventoryMovementForm', () => {
  it('exige motivo para ajuste manual', async () => {
    const user = userEvent.setup()
    render(<InventoryMovementForm item={item} onSubmit={vi.fn()} />)
    await user.click(screen.getByRole('radio', { name: /Ajuste manual/ }))
    await user.type(screen.getByLabelText(/Quantidade/), '2')
    await user.click(screen.getByRole('button', { name: /Revisar movimentação/ }))
    expect(screen.getByText(/Explique o motivo do ajuste/)).toBeInTheDocument()
  })

  it('bloqueia na interface ajuste que projetaria saldo negativo', async () => {
    const user = userEvent.setup()
    render(<InventoryMovementForm item={item} onSubmit={vi.fn()} />)
    await user.click(screen.getByRole('radio', { name: /Ajuste manual/ }))
    await user.click(screen.getByRole('radio', { name: /Remover do saldo/ }))
    await user.type(screen.getByLabelText(/Quantidade/), '11')
    await user.type(screen.getByLabelText(/Motivo do ajuste/), 'Contagem física')
    await user.click(screen.getByRole('button', { name: /Revisar movimentação/ }))
    expect(screen.getByText('A saída informada deixaria o estoque negativo.')).toBeInTheDocument()
  })

  it('exige confirmação explícita antes de registrar entrada', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<InventoryMovementForm item={item} onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText(/Quantidade/), '5')
    await user.type(screen.getByLabelText(/Custo unitário/), '50')
    await user.click(screen.getByRole('button', { name: /Revisar movimentação/ }))
    expect(onSubmit).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /Confirmar movimentação/ }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      movement_type: 'entry',
      quantity: '5',
      unit_cost: '50',
    }))
  })
})
