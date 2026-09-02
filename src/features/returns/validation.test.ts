import { describe, expect, it } from 'vitest'
import { datePlusDays } from './formatters'
import type { ReturnScheduleInput, ReturnScheduleOptions } from './types'
import { validateReturnCancellation, validateReturnSchedule } from './validation'

const options: ReturnScheduleOptions = {
  clients: [{ id: 'client-a', name: 'Academia A' }, { id: 'client-b', name: 'Academia B' }],
  locations: [
    { id: 'location-a', client_id: 'client-a', name: 'Matriz', city: 'Curitiba', state: 'PR' },
    { id: 'location-b', client_id: 'client-b', name: 'Filial', city: 'São Paulo', state: 'SP' },
  ],
  equipment: [
    { id: 'equipment-a', name: 'Esteira', category: 'Cardio' },
    { id: 'equipment-b', name: 'Bike', category: 'Cardio' },
  ],
  cities: ['Curitiba', 'São Paulo'],
}

function validInput(): ReturnScheduleInput {
  return { client_id: 'client-a', client_location_id: 'location-a', equipment_id: 'equipment-a', scheduled_date: datePlusDays(10), notes: '' }
}

describe('return schedule validation', () => {
  it('aceita equipamento geral e exige que a unidade pertença ao cliente', () => {
    expect(validateReturnSchedule(validInput(), options)).toEqual({})

    const otherEquipment = validateReturnSchedule({ ...validInput(), equipment_id: 'equipment-b' }, options)
    expect(otherEquipment).toEqual({})

    const crossLocation = validateReturnSchedule({ ...validInput(), client_location_id: 'location-b' }, options)
    expect(crossLocation.client_location_id).toMatch(/pertencer ao cliente/i)
  })

  it('bloqueia agendamento no passado e observação acima do limite', () => {
    const errors = validateReturnSchedule({ ...validInput(), scheduled_date: datePlusDays(-1), notes: 'x'.repeat(2001) }, options)
    expect(errors.scheduled_date).toMatch(/passado/i)
    expect(errors.notes).toMatch(/2\.000/)
  })

  it('exige motivo rastreável para cancelar', () => {
    expect(validateReturnCancellation('')).toMatch(/pelo menos 3/i)
    expect(validateReturnCancellation('ab')).toMatch(/pelo menos 3/i)
    expect(validateReturnCancellation('Cliente solicitou reagendamento')).toBeNull()
    expect(validateReturnCancellation('x'.repeat(501))).toMatch(/500/)
  })
})
