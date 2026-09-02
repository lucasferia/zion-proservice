export const RETURN_STATUSES = [
  { value: 'pending', label: 'Pendente' },
  { value: 'completed', label: 'Concluído' },
  { value: 'cancelled', label: 'Cancelado' },
] as const

export type ReturnScheduleStatus = (typeof RETURN_STATUSES)[number]['value']
export type ReturnTiming = 'overdue' | 'today' | 'week' | 'next_30' | 'future' | 'completed' | 'cancelled'

export type ReturnSchedule = {
  id: string
  organization_id: string
  client_id: string
  client_name: string
  client_location_id: string | null
  location_name: string | null
  city: string | null
  state: string | null
  equipment_id: string
  equipment_name: string
  origin_maintenance_id: string | null
  origin_work_order_number: string | null
  scheduled_date: string
  status: ReturnScheduleStatus
  notes: string | null
  created_at: string
  created_by: string
  completed_at: string | null
  completed_by: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  cancellation_reason: string | null
  is_overdue: boolean
  days_until: number
  timing: ReturnTiming
}

export type ReturnScheduleSummary = {
  overdue_count: number
  today_count: number
  week_count: number
  next_30_count: number
}

export type ReturnScheduleFilters = {
  periodStart: string
  periodEnd: string
  clientId: string
  city: string
  status: ReturnScheduleStatus | ''
}

export type ReturnScheduleInput = {
  client_id: string
  client_location_id: string
  equipment_id: string
  scheduled_date: string
  notes: string
}

export type ReturnClientOption = { id: string; name: string }
export type ReturnLocationOption = { id: string; client_id: string; name: string; city: string; state: string }
export type ReturnEquipmentOption = { id: string; client_id: string; client_location_id: string | null; name: string; category: string }

export type ReturnScheduleOptions = {
  clients: ReturnClientOption[]
  locations: ReturnLocationOption[]
  equipment: ReturnEquipmentOption[]
  cities: string[]
}

export function getReturnStatusLabel(status: ReturnScheduleStatus) {
  return RETURN_STATUSES.find((option) => option.value === status)?.label ?? status
}
