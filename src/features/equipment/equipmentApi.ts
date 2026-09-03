import { getSupabaseClient } from '../../lib/supabase'
import { friendlyDataError } from '../clients/clientApi'
import type {
  EquipmentDetails,
  EquipmentFilters,
  EquipmentFormOptions,
  EquipmentInput,
  EquipmentSummary,
} from './types'

function requireClient() {
  const client = getSupabaseClient()
  if (!client) throw new Error('A integração com o Supabase não está configurada.')
  return client
}

function optional(value: string) {
  const normalized = value.trim()
  return normalized || null
}

function normalizeEquipment(input: EquipmentInput) {
  return {
    name: input.name.trim(),
    category: input.category.trim(),
    brand: optional(input.brand),
    model: optional(input.model),
    serial_number: optional(input.serial_number),
    asset_tag: optional(input.asset_tag),
    status: input.status,
    notes: optional(input.notes),
  }
}

export async function searchEquipment(
  organizationId: string,
  search: string,
  filters: EquipmentFilters,
) {
  const supabase = requireClient()
  const { data, error } = await supabase.rpc('search_equipment', {
    target_organization_id: organizationId,
    search_term: search.trim() || null,
    filter_client_id: filters.clientId || null,
    filter_location_id: filters.locationId || null,
    filter_category: filters.category || null,
    filter_status: filters.status || null,
  })

  if (error) throw new Error(friendlyDataError(error))
  return (data ?? []) as EquipmentSummary[]
}

export async function getEquipmentFormOptions(
  organizationId: string,
): Promise<EquipmentFormOptions> {
  const supabase = requireClient()
  const categoriesResult = await supabase
    .from('equipment')
    .select('category')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('category')

  const error = categoriesResult.error
  if (error) throw new Error(friendlyDataError(error))

  const categories = Array.from(
    new Set((categoriesResult.data ?? []).map((item) => item.category.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'))

  return {
    categories,
  }
}

export async function getEquipmentDetails(organizationId: string, equipmentId: string) {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('equipment')
    .select(`
      id,
      organization_id,
      name,
      category,
      brand,
      model,
      serial_number,
      asset_tag,
      status,
      notes,
      created_at,
      updated_at
    `)
    .eq('organization_id', organizationId)
    .eq('id', equipmentId)
    .is('deleted_at', null)
    .single()

  if (error) throw new Error(friendlyDataError(error))

  const row = data as unknown as {
    id: string
    organization_id: string
    name: string
    category: string
    brand: string | null
    model: string | null
    serial_number: string | null
    asset_tag: string | null
    status: EquipmentDetails['status']
    notes: string | null
    created_at: string
    updated_at: string
  }

  return {
    id: row.id,
    organization_id: row.organization_id,
    client_id: null,
    client_location_id: null,
    name: row.name,
    category: row.category,
    brand: row.brand,
    model: row.model,
    serial_number: row.serial_number,
    asset_tag: row.asset_tag,
    status: row.status,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    client_name: null,
    location_name: null,
    location_city: null,
  } satisfies EquipmentDetails
}

export async function createEquipment(organizationId: string, input: EquipmentInput) {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('equipment')
    .insert({ organization_id: organizationId, ...normalizeEquipment(input) })
    .select('id')
    .single()

  if (error) throw new Error(friendlyDataError(error))
  return data.id as string
}

export async function updateEquipment(
  organizationId: string,
  equipmentId: string,
  input: EquipmentInput,
) {
  const supabase = requireClient()
  const { error } = await supabase
    .from('equipment')
    .update(normalizeEquipment(input))
    .eq('organization_id', organizationId)
    .eq('id', equipmentId)
    .is('deleted_at', null)
    .select('id')
    .single()

  if (error) throw new Error(friendlyDataError(error))
}

export async function deleteEquipment(organizationId: string, equipmentId: string) {
  const supabase = requireClient()
  const { error } = await supabase.rpc('delete_equipment', {
    target_organization_id: organizationId,
    target_equipment_id: equipmentId,
  })

  if (error) throw new Error(friendlyDataError(error))
}

export async function archiveEquipment(organizationId: string, equipmentId: string) {
  return deleteEquipment(organizationId, equipmentId)
}

export function equipmentToInput(equipment: EquipmentDetails): EquipmentInput {
  return {
    name: equipment.name,
    category: equipment.category,
    brand: equipment.brand ?? '',
    model: equipment.model ?? '',
    serial_number: equipment.serial_number ?? '',
    asset_tag: equipment.asset_tag ?? '',
    status: equipment.status,
    notes: equipment.notes ?? '',
  }
}
