import { MAINTENANCE_PHOTO_SOURCE_MAX_BYTES } from './maintenancePhotoTypes'

const ACCEPTED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function normalizedPhotoType(file: Pick<File, 'type'> & Partial<Pick<File, 'name'>>) {
  const mimeType = file.type.toLowerCase()
  if (mimeType === 'image/jpg') return 'image/jpeg'
  if (ACCEPTED_PHOTO_TYPES.has(mimeType)) return mimeType

  if (!mimeType || mimeType === 'application/octet-stream') {
    const extension = file.name?.split('.').pop()?.toLowerCase()
    if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
    if (extension === 'png') return 'image/png'
    if (extension === 'webp') return 'image/webp'
  }

  return mimeType
}

export function validateMaintenancePhoto(file: Pick<File, 'size' | 'type'> & Partial<Pick<File, 'name'>>) {
  const mimeType = normalizedPhotoType(file)
  if (mimeType === 'image/heic' || mimeType === 'image/heif' || /\.(heic|heif)$/i.test(file.name ?? '')) {
    return 'Fotos HEIC não são compatíveis. No iPhone, escolha “Mais Compatível” na câmera ou envie uma versão JPEG.'
  }
  if (!ACCEPTED_PHOTO_TYPES.has(mimeType)) {
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
