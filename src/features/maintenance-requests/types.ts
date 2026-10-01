export type RequestCriticality = 'low' | 'medium' | 'high' | 'critical'
export type TechnicalPriority = RequestCriticality
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
  technical_priority: TechnicalPriority | null
  public_response?: string | null
  decided_at?: string | null
  converted_at?: string | null
  work_order_number?: string | null
  total_count: number
}

export type PortalMaintenanceRequest = Omit<MaintenanceRequestSummary, 'total_count'> & {
  equipment_category: string
  location_name: string
  cancellation_reason: string | null
  cancelled_at: string | null
  public_response: string | null
  decided_at: string | null
  converted_at: string | null
  work_order_number: string | null
}

export type InternalMaintenanceRequest = Omit<MaintenanceRequestSummary, 'total_count'> & {
  equipment_category: string
  client_name: string
  location_name: string
  requester_name: string
  requester_email: string
  equipment_id: string
  cancellation_reason: string | null
  cancelled_at: string | null
  public_response: string | null
  internal_decision_note: string | null
  decided_at: string | null
  decided_by_name: string | null
  converted_at: string | null
  converted_by_name: string | null
  maintenance_id: string | null
  work_order_number: string | null
}

export type RequestConversionInput = {
  maintenanceType: 'preventive' | 'corrective'
  scheduledAt: string
  responsibleTechnicianId: string
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
