import { businessDateTimeLocalValue, businessDateTimeToIso } from '../../lib/dateTime'
import { getSupabaseClient } from '../../lib/supabase'
import { friendlyDataError } from '../clients/clientApi'
import type { CalendarEvent, CalendarEventFilters, CalendarEventInput, CalendarEventOptions } from './types'

function requireClient() {
  const client = getSupabaseClient()
  if (!client) throw new Error('A integração com o Supabase não está configurada.')
  return client
}

function optional(value: string) {
  return value.trim() || null
}

function payload(input: CalendarEventInput) {
  return {
    title: input.title.trim(),
    description: optional(input.description),
    event_type: input.event_type,
    is_all_day: input.is_all_day,
    event_date: input.is_all_day ? input.event_date : null,
    starts_at: input.is_all_day ? null : businessDateTimeToIso(input.starts_at),
    ends_at: input.is_all_day || !input.ends_at ? null : businessDateTimeToIso(input.ends_at),
    client_id: optional(input.client_id),
    client_location_id: optional(input.client_location_id),
    equipment_id: optional(input.equipment_id),
    maintenance_id: optional(input.maintenance_id),
  }
}

export function friendlyCalendarEventError(error: { code?: string; message?: string } | null) {
  if (!error) return 'Não foi possível concluir a operação na agenda.'
  const message = error.message ?? ''
  const allowed = [
    'Somente o owner', 'Somente eventos agendados', 'Informe um motivo entre',
    'cliente selecionado', 'unidade selecionada', 'equipamento selecionado',
    'ordem de serviço selecionada', 'deve corresponder à ordem de serviço',
    'evento está arquivado', 'Eventos concluídos ou cancelados',
  ]
  if (allowed.some((fragment) => message.toLowerCase().includes(fragment.toLowerCase()))) return message
  return friendlyDataError(error)
}

export async function searchCalendarEvents(
  organizationId: string,
  search: string,
  filters: CalendarEventFilters,
) {
  const supabase = requireClient()
  const { data, error } = await supabase.rpc('search_calendar_events', {
    target_organization_id: organizationId,
    search_term: search.trim() || null,
    period_start: filters.periodStart || null,
    period_end: filters.periodEnd || null,
    filter_event_type: filters.eventType || null,
    filter_status: filters.status || null,
    filter_client_id: filters.clientId || null,
    filter_city: filters.city || null,
  })
  if (error) throw new Error(friendlyCalendarEventError(error))
  return (data ?? []) as CalendarEvent[]
}

export async function getCalendarEvent(organizationId: string, eventId: string) {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('calendar_events')
    .select(`
      id, organization_id, title, description, event_type, status, is_all_day,
      event_date, starts_at, ends_at, client_id, client_location_id, equipment_id,
      maintenance_id, created_at, created_by, updated_at, updated_by, completed_at,
      completed_by, cancelled_at, cancelled_by, cancellation_reason,
      clients(name), client_locations(name, city), equipment(name), maintenances(work_order_number)
    `)
    .eq('organization_id', organizationId)
    .eq('id', eventId)
    .is('archived_at', null)
    .single()
  if (error) throw new Error(friendlyCalendarEventError(error))
  const row = data as unknown as Record<string, unknown>
  const client = row.clients as { name: string } | null
  const location = row.client_locations as { name: string; city: string } | null
  const equipment = row.equipment as { name: string } | null
  const maintenance = row.maintenances as { work_order_number: string } | null
  return {
    ...row,
    client_name: client?.name ?? null,
    location_name: location?.name ?? null,
    location_city: location?.city ?? null,
    equipment_name: equipment?.name ?? null,
    work_order_number: maintenance?.work_order_number ?? null,
  } as unknown as CalendarEvent
}

export async function getCalendarEventOptions(organizationId: string): Promise<CalendarEventOptions> {
  const supabase = requireClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) throw new Error('Sua sessão expirou. Entre novamente.')
  const [membership, clients, locations, equipment, maintenances] = await Promise.all([
    supabase.from('organization_members').select('role').eq('organization_id', organizationId).eq('user_id', authData.user.id).eq('status', 'active').single(),
    supabase.from('clients').select('id, name').eq('organization_id', organizationId).is('deleted_at', null).order('name'),
    supabase.from('client_locations').select('id, client_id, name, city, state').eq('organization_id', organizationId).is('deleted_at', null).order('name'),
    supabase.from('equipment').select('id, name, category').eq('organization_id', organizationId).is('deleted_at', null).order('name'),
    supabase.from('maintenances').select('id, work_order_number, client_id, client_location_id, equipment_id, status').eq('organization_id', organizationId).order('scheduled_at', { ascending: false }).limit(250),
  ])
  const error = membership.error ?? clients.error ?? locations.error ?? equipment.error ?? maintenances.error
  if (error) throw new Error(friendlyCalendarEventError(error))
  const locationRows = locations.data ?? []
  return {
    canManage: membership.data?.role === 'owner',
    clients: clients.data ?? [],
    locations: locationRows,
    equipment: equipment.data ?? [],
    maintenances: maintenances.data ?? [],
    cities: [...new Set(locationRows.map((item) => item.city))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  }
}

export async function createCalendarEvent(organizationId: string, input: CalendarEventInput) {
  const supabase = requireClient()
  const { data, error } = await supabase.from('calendar_events')
    .insert({ organization_id: organizationId, status: 'scheduled', ...payload(input) })
    .select('id').single()
  if (error) throw new Error(friendlyCalendarEventError(error))
  return data.id as string
}

export async function updateCalendarEvent(organizationId: string, eventId: string, input: CalendarEventInput) {
  const supabase = requireClient()
  const { error } = await supabase.from('calendar_events').update(payload(input))
    .eq('organization_id', organizationId).eq('id', eventId).eq('status', 'scheduled')
    .is('archived_at', null).select('id').single()
  if (error) throw new Error(friendlyCalendarEventError(error))
}

export async function completeCalendarEvent(organizationId: string, eventId: string) {
  const supabase = requireClient()
  const { error } = await supabase.rpc('complete_calendar_event', {
    target_organization_id: organizationId, target_event_id: eventId,
  })
  if (error) throw new Error(friendlyCalendarEventError(error))
}

export async function cancelCalendarEvent(organizationId: string, eventId: string, reason: string) {
  const supabase = requireClient()
  const { error } = await supabase.rpc('cancel_calendar_event', {
    target_organization_id: organizationId, target_event_id: eventId, cancellation_reason: reason.trim(),
  })
  if (error) throw new Error(friendlyCalendarEventError(error))
}

export async function archiveCalendarEvent(organizationId: string, eventId: string) {
  const supabase = requireClient()
  const { error } = await supabase.rpc('archive_calendar_event', {
    target_organization_id: organizationId, target_event_id: eventId,
  })
  if (error) throw new Error(friendlyCalendarEventError(error))
}

export function calendarEventToInput(event: CalendarEvent): CalendarEventInput {
  return {
    title: event.title,
    description: event.description ?? '',
    event_type: event.event_type,
    is_all_day: event.is_all_day,
    event_date: event.event_date ?? '',
    starts_at: event.starts_at ? businessDateTimeLocalValue(event.starts_at) : '',
    ends_at: event.ends_at ? businessDateTimeLocalValue(event.ends_at) : '',
    client_id: event.client_id ?? '',
    client_location_id: event.client_location_id ?? '',
    equipment_id: event.equipment_id ?? '',
    maintenance_id: event.maintenance_id ?? '',
  }
}
