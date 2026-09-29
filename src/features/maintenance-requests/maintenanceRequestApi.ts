import { createClientId } from '../../lib/clientId'
import { getSupabaseClient } from '../../lib/supabase'
import { friendlyDataError } from '../clients/clientApi'
import { prepareMaintenancePhoto } from '../maintenances/maintenancePhotoProcessing'
import { maintenancePhotoExtension, validateMaintenancePhoto } from '../maintenances/maintenancePhotoValidation'
import { PortalAuthorizationError } from '../portal/portalApi'
import type { InternalMaintenanceRequest, MaintenanceRequestSummary, RequestCriticality, RequestFilters, RequestPhoto } from './types'

export const REQUEST_PHOTO_BUCKET = 'maintenance-request-photos'
const SIGNED_URL_SECONDS = 300

function client() {
  const value = getSupabaseClient()
  if (!value) throw new Error('A integração com o Supabase não está configurada.')
  return value
}

function fail(error: { code?: string; message?: string } | null, fallback: string): never {
  if (error?.code === '42501' || error?.message?.includes('row-level security')) throw new PortalAuthorizationError()
  throw new Error(error ? friendlyDataError(error) : fallback)
}

export async function createPortalMaintenanceRequest(locationId: string, input: { equipmentId: string; title: string; description: string; criticality: RequestCriticality; submissionKey: string }) {
  const { data, error } = await client().rpc('portal_create_maintenance_request', {
    target_client_location_id: locationId,
    target_equipment_id: input.equipmentId,
    request_title: input.title.trim(),
    request_description: input.description.trim(),
    request_criticality: input.criticality,
    request_submission_key: input.submissionKey,
  })
  if (error) fail(error, 'Não foi possível enviar a solicitação.')
  if (typeof data !== 'string') throw new Error('A solicitação não retornou um identificador válido.')
  return data
}

export async function listPortalMaintenanceRequests(locationId: string, search: string, filters: RequestFilters, page: number, pageSize = 12) {
  const { data, error } = await client().rpc('portal_list_maintenance_requests', { target_client_location_id: locationId, search_term: search || null, filter_status: filters.status || null, filter_criticality: filters.criticality || null, page_number: page, page_size: pageSize })
  if (error) fail(error, 'Não foi possível carregar as solicitações.')
  const items = (data ?? []) as MaintenanceRequestSummary[]
  const total = Number(items[0]?.total_count ?? 0)
  return { items, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) }
}

export async function getPortalMaintenanceRequest(locationId: string, requestId: string) {
  const { data, error } = await client().rpc('portal_get_maintenance_request', { target_client_location_id: locationId, target_request_id: requestId })
  if (error) fail(error, 'Não foi possível carregar a solicitação.')
  return (data as unknown[] | null)?.[0] as import('./types').PortalMaintenanceRequest | undefined
}

export async function cancelPortalMaintenanceRequest(locationId: string, requestId: string, reason: string) {
  const { error } = await client().rpc('portal_cancel_maintenance_request', { target_client_location_id: locationId, target_request_id: requestId, cancel_reason: reason.trim() })
  if (error) fail(error, 'Não foi possível cancelar a solicitação.')
}

async function signPhotos(rows: Omit<RequestPhoto, 'signed_url'>[]) {
  if (!rows.length) return []
  const result = await client().storage.from(REQUEST_PHOTO_BUCKET).createSignedUrls(rows.map((row) => row.storage_path), SIGNED_URL_SECONDS)
  if (result.error) fail(result.error, 'Não foi possível abrir as fotos com segurança.')
  return rows.map((row, index) => ({ ...row, signed_url: result.data?.[index]?.signedUrl ?? '' }))
}

export async function getPortalRequestPhotos(locationId: string, requestId: string) {
  const { data, error } = await client().rpc('portal_list_maintenance_request_photos', { target_client_location_id: locationId, target_request_id: requestId })
  if (error) fail(error, 'Não foi possível carregar as fotos.')
  return signPhotos((data ?? []) as Omit<RequestPhoto, 'signed_url'>[])
}

export async function uploadPortalRequestPhoto(locationId: string, requestId: string, file: File, order: number, stage?: (value: 'preparing' | 'uploading') => void) {
  const validation = validateMaintenancePhoto(file)
  if (validation) throw new Error(validation)
  stage?.('preparing')
  const processed = await prepareMaintenancePhoto(file)
  const prefix = await client().rpc('portal_get_maintenance_request_upload_prefix', { target_client_location_id: locationId, target_request_id: requestId })
  if (prefix.error || typeof prefix.data !== 'string') fail(prefix.error, 'Não foi possível preparar o envio seguro.')
  const path = `${prefix.data}/${createClientId()}.${maintenancePhotoExtension(processed.type)}`
  stage?.('uploading')
  const storage = await client().storage.from(REQUEST_PHOTO_BUCKET).upload(path, processed, { cacheControl: '300', contentType: processed.type, upsert: false })
  if (storage.error) fail(storage.error, 'Não foi possível enviar a foto.')
  const metadata = await client().rpc('portal_register_maintenance_request_photo', { target_client_location_id: locationId, target_request_id: requestId, target_storage_path: path, target_mime_type: processed.type, target_file_size: processed.size, target_sort_order: order })
  if (metadata.error) {
    await client().storage.from(REQUEST_PHOTO_BUCKET).remove([path])
    fail(metadata.error, 'A foto não foi registrada.')
  }
}

export async function removePortalRequestPhoto(locationId: string, requestId: string, photoId: string) {
  const tombstone = await client().rpc('portal_remove_maintenance_request_photo', { target_client_location_id: locationId, target_request_id: requestId, target_photo_id: photoId })
  if (tombstone.error) fail(tombstone.error, 'Não foi possível remover a foto.')
  if (typeof tombstone.data !== 'string') throw new Error('A foto não retornou um caminho válido.')
  const storage = await client().storage.from(REQUEST_PHOTO_BUCKET).remove([tombstone.data])
  if (storage.error) throw new Error('A foto foi ocultada e será removida do armazenamento na próxima tentativa.')
}

export async function listInternalMaintenanceRequests(organizationId: string, search: string, filters: RequestFilters, page: number, pageSize = 20) {
  const { data, error } = await client().rpc('internal_list_maintenance_requests', { target_organization_id: organizationId, search_term: search || null, filter_status: filters.status || null, filter_criticality: filters.criticality || null, page_number: page, page_size: pageSize })
  if (error) throw new Error(friendlyDataError(error))
  const items = (data ?? []) as MaintenanceRequestSummary[]
  return { items, total: Number(items[0]?.total_count ?? 0), pageCount: Math.max(1, Math.ceil(Number(items[0]?.total_count ?? 0) / pageSize)) }
}

export async function getInternalMaintenanceRequest(organizationId: string, requestId: string) {
  const [request, photos] = await Promise.all([
    client().rpc('internal_get_maintenance_request', { target_organization_id: organizationId, target_request_id: requestId }),
    client().rpc('internal_list_maintenance_request_photos', { target_organization_id: organizationId, target_request_id: requestId }),
  ])
  if (request.error) throw new Error(friendlyDataError(request.error))
  if (photos.error) throw new Error(friendlyDataError(photos.error))
  return { request: (request.data as unknown[] | null)?.[0] as InternalMaintenanceRequest | undefined, photos: await signPhotos((photos.data ?? []) as Omit<RequestPhoto, 'signed_url'>[]) }
}
