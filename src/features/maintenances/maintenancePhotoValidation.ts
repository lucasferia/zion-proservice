import { MAINTENANCE_PHOTO_SOURCE_MAX_BYTES } from './maintenancePhotoTypes'

const ACCEPTED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function validateMaintenancePhoto(file: Pick<File, 'size' | 'type'>) {
  if (!ACCEPTED_PHOTO_TYPES.has(file.type)) {
    return 'Use uma imagem JPEG, PNG ou WebP.'
  }
  if (file.size <= 0) return 'O arquivo selecionado está vazio.'
  if (file.size > MAINTENANCE_PHOTO_SOURCE_MAX_BYTES) {
    return 'A foto original deve ter no máximo 15 MB.'
  }
  return null
}

export function maintenancePhotoExtension(mimeType: string) {
  if (mimeType === 'image/webp') return 'webp'
  throw new Error('A imagem precisa ser convertida para WebP antes do envio.')
}
