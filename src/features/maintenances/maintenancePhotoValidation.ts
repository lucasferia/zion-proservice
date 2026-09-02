import { MAINTENANCE_PHOTO_MAX_BYTES } from './maintenancePhotoTypes'

const ACCEPTED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function validateMaintenancePhoto(file: Pick<File, 'size' | 'type'>) {
  if (!ACCEPTED_PHOTO_TYPES.has(file.type)) {
    return 'Use uma imagem JPEG, PNG ou WebP.'
  }
  if (file.size <= 0) return 'O arquivo selecionado está vazio.'
  if (file.size > MAINTENANCE_PHOTO_MAX_BYTES) {
    return 'A foto deve ter no máximo 10 MB.'
  }
  return null
}

export function maintenancePhotoExtension(mimeType: string) {
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  throw new Error('Formato de imagem não permitido.')
}
