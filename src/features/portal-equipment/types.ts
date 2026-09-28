import type { EquipmentStatus } from '../equipment/types'

export type PortalEquipmentSummary = {
  id: string
  name: string
  category: string
  brand: string | null
  model: string | null
  serial_number: string | null
  asset_tag: string | null
  status: EquipmentStatus
  created_at: string
  location_name: string
  total_count: number
}

export type PortalEquipmentDetails = Omit<PortalEquipmentSummary, 'total_count'> & {
  notes: string | null
  created_source: 'internal' | 'academy_portal'
}

export type PortalEquipmentInput = {
  name: string
  category: string
  brand: string
  model: string
  serial_number: string
  asset_tag: string
  notes: string
}

export type PortalEquipmentPage = {
  items: PortalEquipmentSummary[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}
