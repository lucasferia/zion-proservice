import { MAINTENANCE_PHOTO_SOURCE_MAX_BYTES } from './maintenancePhotoTypes'

const ACCEPTED_PHOTO_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

export const MAINTENANCE_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif'

function normalizedPhotoType(file: Pick<File, 'type'> & Partial<Pick<File, 'name'>>) {
  const mimeType = file.type.toLowerCase()
  if (mimeType === 'image/jpg') return 'image/jpeg'
  if (mimeType === 'image/heic-sequence') return 'image/heic'
  if (mimeType === 'image/heif-sequence') return 'image/heif'
  if (ACCEPTED_PHOTO_TYPES.has(mimeType)) return mimeType

  if (!mimeType || mimeType === 'application/octet-stream') {
    const extension = file.name?.split('.').pop()?.toLowerCase()
    if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
    if (extension === 'png') return 'image/png'
    if (extension === 'webp') return 'image/webp'
    if (extension === 'heic') return 'image/heic'
    if (extension === 'heif') return 'image/heif'
  }

  return mimeType
}

export function isHeicPhotoFile(file: Pick<File, 'type'> & Partial<Pick<File, 'name'>>) {
  const mimeType = normalizedPhotoType(file)
  return mimeType === 'image/heic'
    || mimeType === 'image/heif'
    || /\.(heic|heif)$/i.test(file.name ?? '')
}

export function validateMaintenancePhoto(file: Pick<File, 'size' | 'type'> & Partial<Pick<File, 'name'>>) {
  const mimeType = normalizedPhotoType(file)
  if (!ACCEPTED_PHOTO_TYPES.has(mimeType)) {
    return 'Use uma imagem JPEG, PNG, WebP, HEIC ou HEIF.'
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
