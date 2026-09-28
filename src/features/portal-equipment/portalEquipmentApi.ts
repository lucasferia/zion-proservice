import { getSupabaseClient } from '../../lib/supabase'
import { PortalAuthorizationError } from '../portal/portalApi'
import type {
  PortalEquipmentDetails,
  PortalEquipmentInput,
  PortalEquipmentPage,
  PortalEquipmentSummary,
} from './types'

export class PortalEquipmentNotFoundError extends Error {
  constructor() {
    super('Este equipamento não está disponível nesta unidade.')
    this.name = 'PortalEquipmentNotFoundError'
  }
}

function requireClient() {
  const client = getSupabaseClient()
  if (!client) throw new Error('A integração com o Supabase não está configurada.')
  return client
}

function mapError(error: { code?: string } | null, fallback: string): never {
  if (error?.code === '42501') throw new PortalAuthorizationError()
  if (error?.code === 'P0002') throw new PortalEquipmentNotFoundError()
  throw new Error(fallback)
}

function optional(value: string) {
  const normalized = value.trim()
  return normalized || null
}

export async function listPortalEquipment(
  locationId: string,
  search: string,
  page: number,
  pageSize = 12,
): Promise<PortalEquipmentPage> {
  const { data, error } = await requireClient().rpc('portal_list_equipment', {
    target_client_location_id: locationId,
    search_term: search.trim() || null,
    page_number: page,
    page_size: pageSize,
  })
  if (error) mapError(error, 'Não foi possível carregar os equipamentos desta unidade.')
  const items = (data ?? []) as PortalEquipmentSummary[]
  const total = Number(items[0]?.total_count ?? 0)
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) }
}

export async function getPortalEquipment(locationId: string, equipmentId: string) {
  const { data, error } = await requireClient().rpc('portal_get_equipment', {
    target_client_location_id: locationId,
    target_equipment_id: equipmentId,
  })
  if (error) mapError(error, 'Não foi possível carregar este equipamento.')
  const row = (data as PortalEquipmentDetails[] | null)?.[0]
  if (!row) throw new PortalEquipmentNotFoundError()
  return row
}

export async function createPortalEquipment(locationId: string, input: PortalEquipmentInput) {
  const { data, error } = await requireClient().rpc('portal_create_equipment', {
    target_client_location_id: locationId,
    equipment_name: input.name.trim(),
    equipment_category: input.category.trim(),
    equipment_brand: optional(input.brand),
    equipment_model: optional(input.model),
    equipment_serial_number: optional(input.serial_number),
    equipment_asset_tag: optional(input.asset_tag),
    equipment_notes: optional(input.notes),
  })
  if (error) mapError(error, 'Não foi possível cadastrar o equipamento.')
  if (typeof data !== 'string') throw new Error('O cadastro não retornou um identificador válido.')
  return data
}
