import type { MaintenanceStatus } from './types'

export const MAINTENANCE_PHOTO_BUCKET = 'maintenance-photos'
export const MAINTENANCE_PHOTO_SOURCE_MAX_BYTES = 15 * 1024 * 1024
export const MAINTENANCE_PHOTO_FINAL_MAX_BYTES = 1024 * 1024
export const MAINTENANCE_PHOTO_MAX_DIMENSION = 1600
export const MAINTENANCE_PHOTO_SIGNED_URL_SECONDS = 300

export const MAINTENANCE_PHOTO_KINDS = [
  { value: 'before', label: 'Antes' },
  { value: 'after', label: 'Depois' },
] as const

export type MaintenancePhotoKind = (typeof MAINTENANCE_PHOTO_KINDS)[number]['value']

export type MaintenancePhoto = {
  id: string
  organization_id: string
  maintenance_id: string
  kind: MaintenancePhotoKind
  bucket_id: typeof MAINTENANCE_PHOTO_BUCKET
  storage_path: string
  mime_type: 'image/jpeg' | 'image/png' | 'image/webp'
  file_size: number
  sort_order: number
  created_at: string
  created_by: string
  signed_url: string
}

export type MaintenancePhotoSectionProps = {
  organizationId: string
  maintenanceId: string
  status: MaintenanceStatus
}
