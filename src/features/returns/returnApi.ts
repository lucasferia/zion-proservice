import { getSupabaseClient } from '../../lib/supabase'
import { friendlyDataError } from '../clients/clientApi'
import type {
  ReturnSchedule,
  ReturnScheduleFilters,
  ReturnScheduleInput,
  ReturnScheduleOptions,
  ReturnScheduleSummary,
} from './types'

function requireClient() {
  const client = getSupabaseClient()
  if (!client) throw new Error('A integração com o Supabase não está configurada.')
  return client
}

export function friendlyReturnError(error: { code?: string; message?: string } | null) {
  if (!error) return 'Não foi possível concluir a operação na agenda.'
  const message = error.message ?? ''
  const safeFragments = [
    'data do retorno não pode',
    'data de retorno igual ou posterior',
    'Somente retornos pendentes',
    'Retornos concluídos ou cancelados são imutáveis',
    'unidade deve corresponder',
    'equipamento arquivado',
    'cliente arquivado',
    'unidade arquivada',
    'Informe um motivo entre',
  ]
  if (safeFragments.some((fragment) => message.toLowerCase().includes(fragment.toLowerCase()))) return message
  if (error.code === '23503') return 'Um dos vínculos selecionados não está mais disponível.'
  if (error.code === '23514' || error.code === '22007') return 'Revise a data e os vínculos do retorno.'
  return friendlyDataError(error)
}

export async function searchReturnSchedules(
  organizationId: string,
  search: string,
  filters: ReturnScheduleFilters,
  equipmentId: string | null = null,
) {
  const supabase = requireClient()
  const { data, error } = await supabase.rpc('search_return_schedules', {
    target_organization_id: organizationId,
    search_term: search.trim() || null,
    period_start: filters.periodStart || null,
    period_end: filters.periodEnd || null,
    filter_client_id: filters.clientId || null,
    filter_city: filters.city || null,
    filter_status: filters.status || null,
    filter_equipment_id: equipmentId,
  })
  if (error) throw new Error(friendlyReturnError(error))
  return (data ?? []) as ReturnSchedule[]
}

export async function getReturnScheduleSummary(organizationId: string) {
  const supabase = requireClient()
  const { data, error } = await supabase.rpc('get_return_schedule_summary', {
    target_organization_id: organizationId,
  })
  if (error) throw new Error(friendlyReturnError(error))
  return (data?.[0] ?? { overdue_count: 0, today_count: 0, week_count: 0, next_30_count: 0 }) as ReturnScheduleSummary
}

export async function getReturnScheduleOptions(organizationId: string): Promise<ReturnScheduleOptions> {
  const supabase = requireClient()
  const [clients, locations, equipment] = await Promise.all([
    supabase.from('clients').select('id, name').eq('organization_id', organizationId).is('deleted_at', null).order('name'),
    supabase.from('client_locations').select('id, client_id, name, city, state').eq('organization_id', organizationId).is('deleted_at', null).order('name'),
    supabase.from('equipment').select('id, name, category').eq('organization_id', organizationId).is('deleted_at', null).neq('status', 'inactive').order('name'),
  ])
  const error = clients.error ?? locations.error ?? equipment.error
  if (error) throw new Error(friendlyReturnError(error))
  const locationRows = locations.data ?? []
  return {
    clients: clients.data ?? [],
    locations: locationRows,
    equipment: equipment.data ?? [],
    cities: [...new Set(locationRows.map((location) => location.city))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  }
}

export async function createReturnSchedule(organizationId: string, input: ReturnScheduleInput) {
  const supabase = requireClient()
  const { error } = await supabase.from('return_schedules').insert({
    organization_id: organizationId,
    client_id: input.client_id,
    client_location_id: input.client_location_id || null,
    equipment_id: input.equipment_id,
    scheduled_date: input.scheduled_date,
    notes: input.notes.trim() || null,
  })
  if (error) throw new Error(friendlyReturnError(error))
}

export async function completeReturnSchedule(organizationId: string, returnScheduleId: string) {
  const supabase = requireClient()
  const { error } = await supabase.rpc('complete_return_schedule', {
    target_organization_id: organizationId,
    target_return_schedule_id: returnScheduleId,
  })
  if (error) throw new Error(friendlyReturnError(error))
}

export async function cancelReturnSchedule(organizationId: string, returnScheduleId: string, reason: string) {
  const supabase = requireClient()
  const { error } = await supabase.rpc('cancel_return_schedule', {
    target_organization_id: organizationId,
    target_return_schedule_id: returnScheduleId,
    cancellation_reason: reason.trim(),
  })
  if (error) throw new Error(friendlyReturnError(error))
}
