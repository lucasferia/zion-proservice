import { describe, expect, it } from 'vitest'
import type { CalendarEventInput, CalendarEventOptions } from './types'
import { validateCalendarEvent, validateCalendarEventCancellation } from './validation'

const options: CalendarEventOptions = {
  canManage: true,
  clients: [{ id: 'client-a', name: 'Cliente A' }, { id: 'client-b', name: 'Cliente B' }],
  locations: [
    { id: 'location-a', client_id: 'client-a', name: 'Matriz', city: 'Curitiba', state: 'PR' },
    { id: 'location-b', client_id: 'client-b', name: 'Filial', city: 'Londrina', state: 'PR' },
  ],
  equipment: [{ id: 'equipment-a', name: 'Esteira', category: 'Cardio' }],
  maintenances: [{ id: 'maintenance-a', work_order_number: 'OS-001', client_id: 'client-a', client_location_id: 'location-a', equipment_id: 'equipment-a', status: 'draft' }],
  cities: ['Curitiba', 'Londrina'],
}

function validInput(): CalendarEventInput {
  return {
    title: 'Visita técnica', description: '', event_type: 'technical_visit', is_all_day: false,
    event_date: '', starts_at: '2026-09-22T09:00', ends_at: '2026-09-22T10:00',
    client_id: '', client_location_id: '', equipment_id: '', maintenance_id: '',
  }
}

describe('calendar event validation', () => {
  it('aceita evento independente com horário ou de dia inteiro', () => {
    expect(validateCalendarEvent(validInput(), options)).toEqual({})
    expect(validateCalendarEvent({ ...validInput(), is_all_day: true, event_date: '2026-09-22', starts_at: '', ends_at: '' }, options)).toEqual({})
  })

  it('rejeita intervalo invertido e dia inteiro sem data', () => {
    expect(validateCalendarEvent({ ...validInput(), ends_at: '2026-09-22T08:59' }, options).ends_at).toMatch(/posterior/i)
    expect(validateCalendarEvent({ ...validInput(), is_all_day: true, event_date: '' }, options).event_date).toMatch(/data/i)
  })

  it('protege unidade e vínculos de OS incompatíveis', () => {
    const location = validateCalendarEvent({ ...validInput(), client_id: 'client-a', client_location_id: 'location-b' }, options)
    expect(location.client_location_id).toMatch(/pertencer/i)
    const maintenance = validateCalendarEvent({ ...validInput(), maintenance_id: 'maintenance-a', client_id: 'client-b' }, options)
    expect(maintenance.client_id).toMatch(/corresponder/i)
  })

  it('exige motivo rastreável no cancelamento', () => {
    expect(validateCalendarEventCancellation('x')).toMatch(/3 caracteres/i)
    expect(validateCalendarEventCancellation('Cliente desmarcou')).toBeNull()
  })
})
