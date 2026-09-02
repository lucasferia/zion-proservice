import { getSupabaseClient } from '../../lib/supabase'
import { businessDateBoundary, businessDateTimeLocalValue, businessDateTimeToIso } from '../../lib/dateTime'
import { friendlyDataError } from '../clients/clientApi'
import type {
  CompletionResult,
  MaintenanceDetails,
  MaintenanceFilters,
  MaintenanceFormOptions,
  MaintenanceInput,
  MaintenancePart,
  MaintenancePartInput,
  MaintenanceSummary,
  MaintenanceTechnicianOption,
} from './types'
import { parseDecimal } from './validation'

function requireClient() {
  const client = getSupabaseClient()
  if (!client) throw new Error('A integração com o Supabase não está configurada.')
  return client
}

function optional(value: string) {
  const normalized = value.trim()
  return normalized || null
}

function dateBoundary(value: string, exclusiveEnd = false) {
  return businessDateBoundary(value, exclusiveEnd)
}

function normalizeMaintenance(input: MaintenanceInput) {
  return {
    client_id: input.client_id,
    client_location_id: input.client_location_id || null,
    equipment_id: input.equipment_id,
    maintenance_type: input.maintenance_type,
    status: input.status,
    scheduled_at: businessDateTimeToIso(input.scheduled_at),
    next_return_date: input.next_return_date,
    diagnosis: optional(input.diagnosis),
    service_performed: optional(input.service_performed),
    notes: optional(input.notes),
    responsible_technician_id: input.responsible_technician_id,
    total_amount: parseDecimal(input.total_amount),
  }
}

export function friendlyMaintenanceError(error: { code?: string; message?: string } | null) {
  if (!error) return 'Não foi possível concluir a operação.'
  const message = error.message ?? ''
  const safeMessages = [
    'Saldo insuficiente',
    'Informe o diagnóstico',
    'Informe o serviço realizado',
    'Somente manutenções abertas',
    'Esta manutenção faz parte do histórico',
    'Peças de uma manutenção concluída',
    'O item precisa estar ativo',
    'não está ativo para consumo',
    'Cliente e unidade devem corresponder',
  ]
  const matched = safeMessages.find((fragment) => message.includes(fragment))
  if (matched) return message
  if (error.code === '23505') return 'Este item já foi adicionado à ordem de serviço.'
  if (error.code === '23503') return 'Um dos vínculos selecionados não está mais disponível.'
  if (error.code === '23514' || error.code === '22023') return 'Revise os dados informados e tente novamente.'
  return friendlyDataError(error)
}

export async function searchMaintenances(
  organizationId: string,
  search: string,
  filters: MaintenanceFilters,
  equipmentId: string | null = null,
) {
  const supabase = requireClient()
  const { data, error } = await supabase.rpc('search_maintenances', {
    target_organization_id: organizationId,
    search_term: search.trim() || null,
    period_start: dateBoundary(filters.periodStart),
    period_end: dateBoundary(filters.periodEnd, true),
    filter_type: filters.type || null,
    filter_status: filters.status || null,
    filter_equipment_id: equipmentId,
  })

  if (error) throw new Error(friendlyMaintenanceError(error))
  return (data ?? []) as MaintenanceSummary[]
}

export async function getMaintenanceFormOptions(
  organizationId: string,
): Promise<MaintenanceFormOptions> {
  const supabase = requireClient()
  const [clients, locations, equipment, inventory, technicians] = await Promise.all([
    supabase.from('clients').select('id, name').eq('organization_id', organizationId).is('deleted_at', null).order('name'),
    supabase.from('client_locations').select('id, client_id, name, city, state').eq('organization_id', organizationId).is('deleted_at', null).order('name'),
    supabase.from('equipment').select('id, name, category, status').eq('organization_id', organizationId).is('deleted_at', null).neq('status', 'inactive').order('name'),
    supabase.from('inventory_items').select('id, name, sku, unit_of_measure, current_quantity, average_unit_cost').eq('organization_id', organizationId).is('deleted_at', null).eq('status', 'active').order('name'),
    supabase.rpc('get_organization_technicians', { target_organization_id: organizationId }),
  ])

  const error = clients.error ?? locations.error ?? equipment.error ?? inventory.error ?? technicians.error
  if (error) throw new Error(friendlyMaintenanceError(error))

  return {
    clients: clients.data ?? [],
    locations: locations.data ?? [],
    equipment: equipment.data ?? [],
    inventory: inventory.data ?? [],
    technicians: (technicians.data ?? []) as MaintenanceTechnicianOption[],
  }
}

export async function getMaintenanceDetails(organizationId: string, maintenanceId: string) {
  const supabase = requireClient()
  const [maintenanceResult, partsResult, techniciansResult] = await Promise.all([
    supabase
      .from('maintenances')
      .select(`
        id, organization_id, work_order_number, maintenance_type, status,
        scheduled_at, next_return_date, diagnosis, service_performed, notes, total_amount,
        client_id, client_location_id, equipment_id, responsible_technician_id,
        cancellation_reason, cancelled_at, cancelled_by, completed_at, completed_by,
        created_at, updated_at,
        clients!maintenances_client_organization_fk (name),
        client_locations!maintenances_location_client_organization_fk (name),
        equipment!maintenances_equipment_client_organization_fk (name)
      `)
      .eq('organization_id', organizationId)
      .eq('id', maintenanceId)
      .single(),
    supabase
      .from('maintenance_parts')
      .select(`
        id, organization_id, maintenance_id, inventory_item_id, quantity,
        unit_cost_snapshot, total_cost_snapshot, inventory_movement_id,
        created_at, updated_at,
        inventory_items!maintenance_parts_item_organization_fk (
          name, sku, unit_of_measure, current_quantity, average_unit_cost
        )
      `)
      .eq('organization_id', organizationId)
      .eq('maintenance_id', maintenanceId)
      .order('created_at'),
    supabase.rpc('get_organization_technicians', { target_organization_id: organizationId }),
  ])

  const error = maintenanceResult.error ?? partsResult.error ?? techniciansResult.error
  if (error) throw new Error(friendlyMaintenanceError(error))
  if (!maintenanceResult.data) throw new Error('Ordem de serviço não encontrada.')

  const row = maintenanceResult.data as unknown as {
    id: string
    organization_id: string
    work_order_number: string
    maintenance_type: MaintenanceDetails['maintenance_type']
    status: MaintenanceDetails['status']
    scheduled_at: string
    next_return_date: string | null
    diagnosis: string | null
    service_performed: string | null
    notes: string | null
    total_amount: number
    client_id: string
    client_location_id: string | null
    equipment_id: string
    responsible_technician_id: string
    cancellation_reason: string | null
    cancelled_at: string | null
    cancelled_by: string | null
    completed_at: string | null
    completed_by: string | null
    created_at: string
    updated_at: string
    clients: { name: string }
    client_locations: { name: string } | null
    equipment: { name: string }
  }

  const parts = (partsResult.data ?? []).map((part) => {
    const item = part.inventory_items as unknown as {
      name: string
      sku: string | null
      unit_of_measure: string
      current_quantity: number
      average_unit_cost: number
    }
    return {
      id: part.id,
      organization_id: part.organization_id,
      maintenance_id: part.maintenance_id,
      inventory_item_id: part.inventory_item_id,
      quantity: part.quantity,
      unit_cost_snapshot: part.unit_cost_snapshot,
      total_cost_snapshot: part.total_cost_snapshot,
      inventory_movement_id: part.inventory_movement_id,
      created_at: part.created_at,
      updated_at: part.updated_at,
      item_name: item.name,
      item_sku: item.sku,
      unit_of_measure: item.unit_of_measure,
      available_quantity: item.current_quantity,
      current_average_cost: item.average_unit_cost,
    } satisfies MaintenancePart
  })
  const technicians = (techniciansResult.data ?? []) as MaintenanceTechnicianOption[]

  return {
    id: row.id,
    organization_id: row.organization_id,
    work_order_number: row.work_order_number,
    maintenance_type: row.maintenance_type,
    status: row.status,
    scheduled_at: row.scheduled_at,
    next_return_date: row.next_return_date,
    total_amount: row.total_amount,
    client_id: row.client_id,
    client_name: row.clients.name,
    client_location_id: row.client_location_id,
    location_name: row.client_locations?.name ?? null,
    equipment_id: row.equipment_id,
    equipment_name: row.equipment.name,
    responsible_technician_id: row.responsible_technician_id,
    technician_name: technicians.find((item) => item.user_id === row.responsible_technician_id)?.full_name
      ?? 'Técnico da organização',
    part_count: parts.length,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    diagnosis: row.diagnosis,
    service_performed: row.service_performed,
    notes: row.notes,
    cancellation_reason: row.cancellation_reason,
    cancelled_at: row.cancelled_at,
    cancelled_by: row.cancelled_by,
    completed_by: row.completed_by,
    parts,
  } satisfies MaintenanceDetails
}

export async function createMaintenance(organizationId: string, input: MaintenanceInput) {
  const supabase = requireClient()
  const normalized = normalizeMaintenance(input)
  const draft = {
    client_id: normalized.client_id,
    client_location_id: normalized.client_location_id,
    equipment_id: normalized.equipment_id,
    maintenance_type: normalized.maintenance_type,
    scheduled_at: normalized.scheduled_at,
    next_return_date: normalized.next_return_date,
    diagnosis: normalized.diagnosis,
    service_performed: normalized.service_performed,
    notes: normalized.notes,
    responsible_technician_id: normalized.responsible_technician_id,
    total_amount: normalized.total_amount,
  }
  const { data, error } = await supabase
    .from('maintenances')
    .insert({ organization_id: organizationId, ...draft })
    .select('id')
    .single()

  if (error) throw new Error(friendlyMaintenanceError(error))
  return data.id as string
}

export async function updateMaintenance(
  organizationId: string,
  maintenanceId: string,
  input: MaintenanceInput,
) {
  const supabase = requireClient()
  const { error } = await supabase
    .from('maintenances')
    .update(normalizeMaintenance(input))
    .eq('organization_id', organizationId)
    .eq('id', maintenanceId)
    .in('status', ['draft', 'in_progress'])
    .select('id')
    .single()

  if (error) throw new Error(friendlyMaintenanceError(error))
}

export async function addMaintenancePart(
  organizationId: string,
  maintenanceId: string,
  input: MaintenancePartInput,
) {
  const supabase = requireClient()
  const { error } = await supabase.from('maintenance_parts').insert({
    organization_id: organizationId,
    maintenance_id: maintenanceId,
    inventory_item_id: input.inventory_item_id,
    quantity: parseDecimal(input.quantity),
  })
  if (error) throw new Error(friendlyMaintenanceError(error))
}

export async function updateMaintenancePart(
  organizationId: string,
  partId: string,
  quantity: string,
) {
  const supabase = requireClient()
  const { error } = await supabase
    .from('maintenance_parts')
    .update({ quantity: parseDecimal(quantity) })
    .eq('organization_id', organizationId)
    .eq('id', partId)
  if (error) throw new Error(friendlyMaintenanceError(error))
}

export async function removeMaintenancePart(organizationId: string, partId: string) {
  const supabase = requireClient()
  const { error } = await supabase
    .from('maintenance_parts')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', partId)
  if (error) throw new Error(friendlyMaintenanceError(error))
}

export async function completeMaintenance(organizationId: string, maintenanceId: string, returnDate: string) {
  const supabase = requireClient()
  const { data, error } = await supabase.rpc('complete_maintenance_with_return', {
    target_organization_id: organizationId,
    target_maintenance_id: maintenanceId,
    target_return_date: returnDate,
  })
  if (error) throw new Error(friendlyMaintenanceError(error))
  return (data?.[0] ?? null) as CompletionResult | null
}

export async function cancelMaintenance(
  organizationId: string,
  maintenanceId: string,
  reason: string,
) {
  const supabase = requireClient()
  const { error } = await supabase.rpc('cancel_maintenance', {
    target_organization_id: organizationId,
    target_maintenance_id: maintenanceId,
    cancellation_reason: reason.trim(),
  })
  if (error) throw new Error(friendlyMaintenanceError(error))
}

export function maintenanceToInput(details: MaintenanceDetails): MaintenanceInput {
  return {
    client_id: details.client_id,
    client_location_id: details.client_location_id ?? '',
    equipment_id: details.equipment_id,
    maintenance_type: details.maintenance_type,
    status: details.status === 'in_progress' ? 'in_progress' : 'draft',
    scheduled_at: businessDateTimeLocalValue(details.scheduled_at),
    next_return_date: details.next_return_date ?? '',
    diagnosis: details.diagnosis ?? '',
    service_performed: details.service_performed ?? '',
    notes: details.notes ?? '',
    responsible_technician_id: details.responsible_technician_id,
    total_amount: String(details.total_amount),
  }
}
