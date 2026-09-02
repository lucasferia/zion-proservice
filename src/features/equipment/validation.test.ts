import { describe, expect, it } from 'vitest'
import { validateEquipment } from './validation'

describe('equipment validation', () => {
  it('aceita equipamento válido com campos opcionais vazios', () => {
    expect(validateEquipment({
      client_id: 'client-a',
      client_location_id: '',
      name: 'Esteira 01',
      category: 'Cardio',
      brand: '',
      model: '',
      serial_number: '',
      asset_tag: '',
      status: 'operational',
      notes: '',
    })).toEqual({})
  })

  it('exige cliente, nome, categoria e status válido', () => {
    const errors = validateEquipment({
      client_id: '',
      client_location_id: '',
      name: 'A',
      category: '',
      brand: '',
      model: '',
      serial_number: '',
      asset_tag: '',
      status: 'invalid' as 'operational',
      notes: '',
    })

    expect(errors.client_id).toBeDefined()
    expect(errors.name).toBeDefined()
    expect(errors.category).toBeDefined()
    expect(errors.status).toBeDefined()
  })

  it('limita identificadores e observações conforme o banco', () => {
    const errors = validateEquipment({
      client_id: 'client-a',
      client_location_id: '',
      name: 'Esteira 01',
      category: 'Cardio',
      brand: 'B'.repeat(101),
      model: 'M'.repeat(121),
      serial_number: 'S'.repeat(121),
      asset_tag: 'P'.repeat(81),
      status: 'attention',
      notes: 'N'.repeat(2001),
    })

    expect(Object.keys(errors)).toEqual(expect.arrayContaining([
      'brand', 'model', 'serial_number', 'asset_tag', 'notes',
    ]))
  })
})
