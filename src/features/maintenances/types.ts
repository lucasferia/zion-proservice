export const MAINTENANCE_TYPES = [
  { value: 'preventive', label: 'Preventiva' },
  { value: 'corrective', label: 'Corretiva' },
] as const

export const MAINTENANCE_STATUSES = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluída' },
  { value: 'cancelled', label: 'Cancelada' },
] as const

export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number]['value']
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number]['value']
export type EditableMaintenanceStatus = Extract<MaintenanceStatus, 'draft' | 'in_progress'>

export type MaintenanceSummary = {
  id: string
  organization_id: string
  work_order_number: string
  maintenance_type: MaintenanceType
  status: MaintenanceStatus
  scheduled_at: string
  next_return_date: string | null
  total_amount: number
  client_id: string
  client_name: string
  client_location_id: string | null
  location_name: string | null
  equipment_id: string
  equipment_name: string
  responsible_technician_id: string
  technician_name: string
  part_count: number
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type MaintenancePart = {
  id: string
  organization_id: string
  maintenance_id: string
  inventory_item_id: string
  quantity: number
  unit_cost_snapshot: number | null
  total_cost_snapshot: number | null
  inventory_movement_id: string | null
  created_at: string
  updated_at: string
  item_name: string
  item_sku: string | null
  unit_of_measure: string
  available_quantity: number
  current_average_cost: number
}

export type MaintenanceDetails = MaintenanceSummary & {
  diagnosis: string | null
  service_performed: string | null
  notes: string | null
  cancellation_reason: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  completed_by: string | null
  parts: MaintenancePart[]
}

export type MaintenanceInput = {
  client_id: string
  client_location_id: string
  equipment_id: string
  maintenance_type: MaintenanceType
  status: EditableMaintenanceStatus
  scheduled_at: string
  next_return_date: string
  diagnosis: string
  service_performed: string
  notes: string
  responsible_technician_id: string
  total_amount: string
}

export type MaintenanceFilters = {
  periodStart: string
  periodEnd: string
  type: MaintenanceType | ''
  status: MaintenanceStatus | ''
}

export type MaintenanceClientOption = { id: string; name: string }
export type MaintenanceLocationOption = {
  id: string
  client_id: string
  name: string
  city: string
  state: string
}
export type MaintenanceEquipmentOption = {
  id: string
  name: string
  category: string
  status: string
}
export type MaintenanceInventoryOption = {
  id: string
  name: string
  sku: string | null
  unit_of_measure: string
  current_quantity: number
  average_unit_cost: number
}
export type MaintenanceTechnicianOption = {
  user_id: string
  full_name: string
  role: 'owner' | 'technician'
}

export type MaintenanceFormOptions = {
  clients: MaintenanceClientOption[]
  locations: MaintenanceLocationOption[]
  equipment: MaintenanceEquipmentOption[]
  inventory: MaintenanceInventoryOption[]
  technicians: MaintenanceTechnicianOption[]
}

export type MaintenancePartInput = {
  inventory_item_id: string
  quantity: string
}

export type CompletionResult = {
  maintenance_id: string
  work_order_number: string
  completed_at: string
  consumed_part_count: number
  inventory_cost: number
  return_schedule_id: string
}

export function getMaintenanceTypeLabel(type: MaintenanceType) {
  return MAINTENANCE_TYPES.find((option) => option.value === type)?.label ?? type
}

export function getMaintenanceStatusLabel(status: MaintenanceStatus) {
  return MAINTENANCE_STATUSES.find((option) => option.value === status)?.label ?? status
}

export function isMaintenanceOpen(status: MaintenanceStatus) {
  return status === 'draft' || status === 'in_progress'
}
