export type RequestCriticality = 'low' | 'medium' | 'high' | 'critical'
export type RequestStatus = 'pending' | 'cancelled' | 'approved' | 'rejected' | 'converted'

export type MaintenanceRequestSummary = {
  id: string
  title: string
  description: string
  reported_criticality: RequestCriticality
  status: RequestStatus
  equipment_id?: string
  equipment_name: string
  client_name?: string
  location_name?: string
  requester_name?: string
  created_at: string
  total_count: number
}

export type PortalMaintenanceRequest = Omit<MaintenanceRequestSummary, 'total_count'> & {
  equipment_category: string
  location_name: string
  cancellation_reason: string | null
  cancelled_at: string | null
}

export type InternalMaintenanceRequest = Omit<MaintenanceRequestSummary, 'total_count'> & {
  equipment_category: string
  client_name: string
  location_name: string
  requester_name: string
  requester_email: string
  cancellation_reason: string | null
  cancelled_at: string | null
}

export type RequestPhoto = {
  id: string
  bucket_id: string
  storage_path: string
  mime_type: 'image/webp' | 'image/jpeg'
  file_size: number
  sort_order: number
  created_at: string
  signed_url: string
}

export type RequestFilters = { status: string; criticality: string }
