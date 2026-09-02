import { describe, expect, it } from 'vitest'
import { validateInventoryItem, validateInventoryMovement } from './validation'

describe('inventory item validation', () => {
  it('aceita item válido com campos opcionais vazios', () => {
    expect(validateInventoryItem({
      name: 'Correia RT 250',
      sku: '',
      category: '',
      unit_of_measure: 'unidade',
      minimum_stock: '2,5',
      average_unit_cost: '45.90',
      status: 'active',
      notes: '',
    })).toEqual({})
  })

  it('rejeita valores negativos e precisão além do banco', () => {
    const errors = validateInventoryItem({
      name: 'A',
      sku: '',
      category: '',
      unit_of_measure: '',
      minimum_stock: '-1',
      average_unit_cost: '1.12345',
      status: 'active',
      notes: '',
    })
    expect(errors.name).toBeDefined()
    expect(errors.unit_of_measure).toBeDefined()
    expect(errors.minimum_stock).toBeDefined()
    expect(errors.average_unit_cost).toBeDefined()
  })
})

describe('inventory movement validation', () => {
  it('exige quantidade positiva e motivo no ajuste', () => {
    const errors = validateInventoryMovement({
      movement_type: 'adjustment',
      direction: 'decrease',
      quantity: '0',
      reason: '',
      unit_cost: '',
    })
    expect(errors.quantity).toBeDefined()
    expect(errors.reason).toBeDefined()
  })

  it('aceita entrada com custo opcional', () => {
    expect(validateInventoryMovement({
      movement_type: 'entry',
      direction: 'increase',
      quantity: '3.5',
      reason: '',
      unit_cost: '',
    })).toEqual({})
  })
})
