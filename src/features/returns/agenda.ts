import { businessDateTimeLocalValue } from '../../lib/dateTime'
import type { CalendarEvent, CalendarEventType } from '../calendar-events/types'
import type { ReturnSchedule } from './types'

export type AgendaStatusFilter = '' | 'scheduled' | 'completed' | 'cancelled'
export type AgendaTypeFilter = '' | 'return' | CalendarEventType

export type AgendaItem = {
  key: string
  source: 'return' | 'calendar_event'
  sourceId: string
  date: string
  timeLabel: string
  title: string
  subtitle: string
  status: AgendaStatusFilter extends '' ? never : Exclude<AgendaStatusFilter, ''>
  timing: string
  returnSchedule?: ReturnSchedule
  calendarEvent?: CalendarEvent
}

export function normalizeReturnAgendaItem(schedule: ReturnSchedule): AgendaItem {
  return {
    key: `return:${schedule.id}`,
    source: 'return', sourceId: schedule.id, date: schedule.scheduled_date,
    timeLabel: 'Dia inteiro', title: `Retorno · ${schedule.client_name}`,
    subtitle: `${schedule.equipment_name} · ${schedule.location_name || 'Sem unidade específica'}`,
    status: schedule.status === 'pending' ? 'scheduled' : schedule.status,
    timing: schedule.timing, returnSchedule: schedule,
  }
}

export function normalizeCalendarEventAgendaItem(event: CalendarEvent): AgendaItem {
  const localStart = event.starts_at ? businessDateTimeLocalValue(event.starts_at) : null
  return {
    key: `calendar_event:${event.id}`,
    source: 'calendar_event', sourceId: event.id,
    date: event.event_date ?? localStart?.slice(0, 10) ?? '',
    timeLabel: event.is_all_day ? 'Dia inteiro' : (localStart?.slice(11, 16) ?? '—'),
    title: event.title,
    subtitle: [event.client_name, event.location_name, event.equipment_name].filter(Boolean).join(' · ') || 'Evento independente',
    status: event.status, timing: event.status, calendarEvent: event,
  }
}

export function mergeAgendaItems(returns: ReturnSchedule[], events: CalendarEvent[]) {
  return [
    ...returns.map(normalizeReturnAgendaItem),
    ...events.map(normalizeCalendarEventAgendaItem),
  ].sort((a, b) => a.date.localeCompare(b.date) || (a.timeLabel === 'Dia inteiro' ? -1 : b.timeLabel === 'Dia inteiro' ? 1 : a.timeLabel.localeCompare(b.timeLabel)) || a.title.localeCompare(b.title, 'pt-BR'))
}

export function returnStatusForAgenda(status: AgendaStatusFilter) {
  return status === 'scheduled' ? 'pending' : status
}

export function agendaItemPath(item: AgendaItem) {
  if (item.source === 'calendar_event') return `/app/agenda/eventos/${item.sourceId}`
  if (item.returnSchedule?.origin_maintenance_id) return `/app/manutencoes/${item.returnSchedule.origin_maintenance_id}`
  return `/app/clientes/${item.returnSchedule?.client_id ?? ''}`
}
