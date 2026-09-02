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
    { id: 'equipment-a', client_id: 'client-a', client_location_id: 'location-a', name: 'Esteira', category: 'Cardio' },
    { id: 'equipment-b', client_id: 'client-b', client_location_id: 'location-b', name: 'Bike', category: 'Cardio' },
  ],
  cities: ['Curitiba', 'São Paulo'],
}

function validInput(): ReturnScheduleInput {
  return { client_id: 'client-a', client_location_id: 'location-a', equipment_id: 'equipment-a', scheduled_date: datePlusDays(10), notes: '' }
}

describe('return schedule validation', () => {
  it('aceita somente o conjunto coerente de cliente, unidade e equipamento', () => {
    expect(validateReturnSchedule(validInput(), options)).toEqual({})

    const crossClient = validateReturnSchedule({ ...validInput(), client_id: 'client-b' }, options)
    expect(crossClient.equipment_id).toMatch(/não pertence ao cliente/i)

    const crossLocation = validateReturnSchedule({ ...validInput(), client_location_id: 'location-b' }, options)
    expect(crossLocation.client_location_id).toMatch(/corresponder ao equipamento/i)
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
