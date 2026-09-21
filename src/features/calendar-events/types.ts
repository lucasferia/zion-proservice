export const CALENDAR_EVENT_TYPES = [
  { value: 'technical_visit', label: 'Visita técnica' },
  { value: 'quote', label: 'Orçamento' },
  { value: 'meeting', label: 'Reunião' },
  { value: 'inspection', label: 'Inspeção' },
  { value: 'installation', label: 'Instalação' },
  { value: 'commercial_visit', label: 'Visita comercial' },
  { value: 'reminder', label: 'Lembrete' },
  { value: 'other', label: 'Outro' },
] as const

export const CALENDAR_EVENT_STATUSES = [
  { value: 'scheduled', label: 'Agendado' },
  { value: 'completed', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
] as const

export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number]['value']
export type CalendarEventStatus = (typeof CALENDAR_EVENT_STATUSES)[number]['value']

export type CalendarEvent = {
  id: string
  organization_id: string
  title: string
  description: string | null
  event_type: CalendarEventType
  status: CalendarEventStatus
  is_all_day: boolean
  event_date: string | null
  starts_at: string | null
  ends_at: string | null
  client_id: string | null
  client_name: string | null
  client_location_id: string | null
  location_name: string | null
  location_city: string | null
  equipment_id: string | null
  equipment_name: string | null
  maintenance_id: string | null
  work_order_number: string | null
  created_at: string
  created_by: string
  updated_at: string
  updated_by: string
  completed_at: string | null
  completed_by: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  cancellation_reason: string | null
}

export type CalendarEventInput = {
  title: string
  description: string
  event_type: CalendarEventType
  is_all_day: boolean
  event_date: string
  starts_at: string
  ends_at: string
  client_id: string
  client_location_id: string
  equipment_id: string
  maintenance_id: string
}

export type CalendarEventFilters = {
  periodStart: string
  periodEnd: string
  eventType: CalendarEventType | ''
  status: CalendarEventStatus | ''
  clientId: string
  city: string
}

export type CalendarEventOptions = {
  canManage: boolean
  clients: Array<{ id: string; name: string }>
  locations: Array<{ id: string; client_id: string; name: string; city: string; state: string }>
  equipment: Array<{ id: string; name: string; category: string }>
  maintenances: Array<{
    id: string
    work_order_number: string
    client_id: string
    client_location_id: string | null
    equipment_id: string
    status: string
  }>
  cities: string[]
}

export function calendarEventTypeLabel(type: CalendarEventType) {
  return CALENDAR_EVENT_TYPES.find((item) => item.value === type)?.label ?? type
}

export function calendarEventStatusLabel(status: CalendarEventStatus) {
  return CALENDAR_EVENT_STATUSES.find((item) => item.value === status)?.label ?? status
}
