import { describe, expect, it } from 'vitest'
import { validatePortalEquipment } from './validation'

const valid = {
  name: 'Esteira 01', category: 'Cardio', brand: '', model: '',
  serial_number: '', asset_tag: '', notes: '',
}

describe('validatePortalEquipment', () => {
  it('reutiliza os limites do cadastro interno', () => {
    expect(validatePortalEquipment(valid)).toEqual({})
  })

  it('rejeita campos obrigatórios e limites inválidos', () => {
    const errors = validatePortalEquipment({ ...valid, name: 'A', category: '', notes: 'x'.repeat(2001) })
    expect(errors.name).toMatch(/pelo menos 2/i)
    expect(errors.category).toMatch(/pelo menos 2/i)
    expect(errors.notes).toMatch(/2.000/i)
  })
})
