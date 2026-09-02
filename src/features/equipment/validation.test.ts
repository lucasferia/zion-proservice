import { describe, expect, it } from 'vitest'
import { validateEquipment } from './validation'

const validEquipment = {
  name: 'Esteira 01', category: 'Cardio', brand: '', model: '', serial_number: '',
  asset_tag: '', status: 'operational' as const, notes: '',
}

describe('equipment validation', () => {
  it('aceita equipamento geral com campos opcionais vazios', () => {
    expect(validateEquipment(validEquipment)).toEqual({})
  })

  it('exige nome, categoria e status válido', () => {
    const errors = validateEquipment({ ...validEquipment, name: 'A', category: '', status: 'invalid' as 'operational' })
    expect(errors.name).toBeDefined()
    expect(errors.category).toBeDefined()
    expect(errors.status).toBeDefined()
  })

  it('limita identificadores e observações conforme o banco', () => {
    const errors = validateEquipment({
      ...validEquipment, brand: 'B'.repeat(101), model: 'M'.repeat(121),
      serial_number: 'S'.repeat(121), asset_tag: 'P'.repeat(81), notes: 'N'.repeat(2001),
    })
    expect(Object.keys(errors)).toEqual(expect.arrayContaining(['brand', 'model', 'serial_number', 'asset_tag', 'notes']))
  })
})
