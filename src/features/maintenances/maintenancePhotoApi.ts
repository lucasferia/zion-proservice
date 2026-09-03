import { getSupabaseClient } from '../../lib/supabase'
import { friendlyDataError } from '../clients/clientApi'
import {
  MAINTENANCE_PHOTO_BUCKET,
  MAINTENANCE_PHOTO_SIGNED_URL_SECONDS,
  type MaintenancePhoto,
  type MaintenancePhotoKind,
} from './maintenancePhotoTypes'
import { prepareMaintenancePhoto } from './maintenancePhotoProcessing'
import { maintenancePhotoExtension, validateMaintenancePhoto } from './maintenancePhotoValidation'

type PhotoRow = Omit<MaintenancePhoto, 'signed_url'>

function requireClient() {
  const client = getSupabaseClient()
  if (!client) throw new Error('A integração com o Supabase não está configurada.')
  return client
}

export function friendlyMaintenancePhotoError(error: { code?: string; message?: string } | null) {
  if (!error) return 'Não foi possível concluir a operação com a foto.'
  const message = error.message ?? ''
  if (message.includes('maximum allowed size') || message.includes('maximum')) {
    return 'A imagem processada deve ter no máximo 1 MB.'
  }
  if (message.includes('mime type') || message.includes('MIME')) {
    return 'Use uma imagem JPEG, PNG ou WebP.'
  }
  if (message.includes('somente leitura') || message.includes('Fotos desta manutenção')) {
    return 'As fotos desta manutenção são somente leitura.'
  }
  if (error.code === '42501' || message.includes('row-level security')) {
    return 'Você não tem permissão para alterar estas fotos.'
  }
  return friendlyDataError(error)
}

export async function getMaintenancePhotos(
  organizationId: string,
  maintenanceId: string,
): Promise<MaintenancePhoto[]> {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('maintenance_photos')
    .select('id, organization_id, maintenance_id, kind, bucket_id, storage_path, mime_type, file_size, sort_order, created_at, created_by')
    .eq('organization_id', organizationId)
    .eq('maintenance_id', maintenanceId)
    .order('kind')
    .order('sort_order')
    .order('created_at')

  if (error) throw new Error(friendlyMaintenancePhotoError(error))
  const rows = (data ?? []) as PhotoRow[]
  if (!rows.length) return []

  const signed = await supabase.storage
    .from(MAINTENANCE_PHOTO_BUCKET)
    .createSignedUrls(rows.map((photo) => photo.storage_path), MAINTENANCE_PHOTO_SIGNED_URL_SECONDS)

  if (signed.error) throw new Error(friendlyMaintenancePhotoError(signed.error))

  return rows.map((photo, index) => {
    const signedResult = signed.data?.[index]
    if (!signedResult?.signedUrl) throw new Error('Não foi possível gerar a visualização segura de uma das fotos.')
    return { ...photo, signed_url: signedResult.signedUrl }
  })
}

export async function uploadMaintenancePhoto(
  organizationId: string,
  maintenanceId: string,
  kind: MaintenancePhotoKind,
  file: File,
  sortOrder: number,
  onProgress?: (progress: number) => void,
  onStage?: (stage: 'preparing' | 'uploading') => void,
) {
  const validationError = validateMaintenancePhoto(file)
  if (validationError) throw new Error(validationError)

  onStage?.('preparing')
  onProgress?.(5)
  const preparedFile = await prepareMaintenancePhoto(file)
  const supabase = requireClient()
  const extension = maintenancePhotoExtension(preparedFile.type)
  const storagePath = `${organizationId}/${maintenanceId}/${kind}/${crypto.randomUUID()}.${extension}`

  onStage?.('uploading')
  onProgress?.(35)
  const upload = await supabase.storage.from(MAINTENANCE_PHOTO_BUCKET).upload(storagePath, preparedFile, {
    cacheControl: '300',
    contentType: 'image/webp',
    upsert: false,
  })
  if (upload.error) throw new Error(friendlyMaintenancePhotoError(upload.error))

  onProgress?.(70)
  const metadata = await supabase.from('maintenance_photos').insert({
    organization_id: organizationId,
    maintenance_id: maintenanceId,
    kind,
    storage_path: storagePath,
    mime_type: 'image/webp',
    file_size: preparedFile.size,
    sort_order: sortOrder,
  })

  if (metadata.error) {
    await supabase.storage.from(MAINTENANCE_PHOTO_BUCKET).remove([storagePath])
    throw new Error(friendlyMaintenancePhotoError(metadata.error))
  }
  onProgress?.(100)
}

export async function removeMaintenancePhoto(photo: MaintenancePhoto) {
  const supabase = requireClient()
  const metadata = await supabase
    .from('maintenance_photos')
    .delete()
    .eq('organization_id', photo.organization_id)
    .eq('id', photo.id)
    .select('id')
    .maybeSingle()

  if (metadata.error) throw new Error(friendlyMaintenancePhotoError(metadata.error))

  const storage = await supabase.storage.from(MAINTENANCE_PHOTO_BUCKET).remove([photo.storage_path])
  if (storage.error) throw new Error(friendlyMaintenancePhotoError(storage.error))

  if (!metadata.data) {
    // Permite concluir a limpeza de um objeto órfão após uma tentativa anterior interrompida.
    return
  }
}

export async function reorderMaintenancePhotos(
  organizationId: string,
  maintenanceId: string,
  kind: MaintenancePhotoKind,
  orderedPhotoIds: string[],
) {
  const supabase = requireClient()
  const { error } = await supabase.rpc('reorder_maintenance_photos', {
    target_organization_id: organizationId,
    target_maintenance_id: maintenanceId,
    target_kind: kind,
    ordered_photo_ids: orderedPhotoIds,
  })
  if (error) throw new Error(friendlyMaintenancePhotoError(error))
}
