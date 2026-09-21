import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from '../calendar-events/types'
import { agendaItemPath, mergeAgendaItems, normalizeCalendarEventAgendaItem } from './agenda'
import type { ReturnSchedule } from './types'

const event = {
  id: 'event-a', organization_id: 'org-a', title: 'Reunião', description: null,
  event_type: 'meeting', status: 'scheduled', is_all_day: false, event_date: null,
  starts_at: '2026-09-21T02:30:00.000Z', ends_at: null,
  client_id: null, client_name: null, client_location_id: null, location_name: null,
  location_city: null, equipment_id: null, equipment_name: null, maintenance_id: null,
  work_order_number: null, created_at: '', created_by: '', updated_at: '', updated_by: '',
  completed_at: null, completed_by: null, cancelled_at: null, cancelled_by: null, cancellation_reason: null,
} satisfies CalendarEvent

const schedule = {
  id: 'return-a', organization_id: 'org-a', client_id: 'client-a', client_name: 'Cliente A',
  client_location_id: null, location_name: null, city: null, state: null, equipment_id: 'equipment-a',
  equipment_name: 'Esteira', origin_maintenance_id: null, origin_work_order_number: null,
  scheduled_date: '2026-09-20', status: 'pending', notes: null, created_at: '', created_by: '',
  completed_at: null, completed_by: null, cancelled_at: null, cancelled_by: null,
  cancellation_reason: null, is_overdue: false, days_until: 0, timing: 'today',
} satisfies ReturnSchedule

describe('agenda unificada', () => {
  it('normaliza timestamptz para a data operacional de São Paulo', () => {
    expect(normalizeCalendarEventAgendaItem(event)).toMatchObject({ date: '2026-09-20', timeLabel: '23:30' })
  })

  it('preserva IDs e origens sem duplicar entidades', () => {
    const items = mergeAgendaItems([schedule], [event])
    expect(items.map((item) => [item.source, item.sourceId])).toEqual([
      ['return', 'return-a'], ['calendar_event', 'event-a'],
    ])
    expect(items[0].key).toBe('return:return-a')
    expect(agendaItemPath(items[0])).toBe('/app/clientes/client-a')
    expect(agendaItemPath(items[1])).toBe('/app/agenda/eventos/event-a')
  })
})
