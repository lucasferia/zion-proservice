import { BUSINESS_TIMEZONE, businessDateTimeLocalValue } from '../../lib/dateTime'
import type { CalendarEvent } from './types'

export function calendarEventDate(event: CalendarEvent) {
  return event.event_date ?? (event.starts_at ? businessDateTimeLocalValue(event.starts_at).slice(0, 10) : '')
}

export function formatCalendarEventDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

export function formatCalendarEventTime(event: CalendarEvent) {
  if (event.is_all_day) return 'Dia inteiro'
  if (!event.starts_at) return 'Horário não informado'
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: BUSINESS_TIMEZONE,
  })
  const start = formatter.format(new Date(event.starts_at))
  return event.ends_at ? `${start}–${formatter.format(new Date(event.ends_at))}` : start
}

export function formatAuditInstant(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short', timeStyle: 'short', timeZone: BUSINESS_TIMEZONE,
  }).format(new Date(value))
}
