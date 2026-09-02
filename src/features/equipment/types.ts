export const EQUIPMENT_STATUSES = [
  { value: 'operational', label: 'Operacional' },
  { value: 'attention', label: 'Em atenção' },
  { value: 'under_maintenance', label: 'Em manutenção' },
  { value: 'inactive', label: 'Inativo' },
] as const

export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number]['value']

export type EquipmentSummary = {
  id: string
  organization_id: string
  client_id: string
  client_location_id: string | null
  name: string
  category: string
  brand: string | null
  model: string | null
  serial_number: string | null
  asset_tag: string | null
  status: EquipmentStatus
  notes: string | null
  created_at: string
  updated_at: string
  client_name: string
  location_name: string | null
  location_city: string | null
}

export type EquipmentDetails = EquipmentSummary

export type EquipmentInput = {
  client_id: string
  client_location_id: string
  name: string
  category: string
  brand: string
  model: string
  serial_number: string
  asset_tag: string
  status: EquipmentStatus
  notes: string
}

export type EquipmentFilters = {
  clientId: string
  locationId: string
  category: string
  status: EquipmentStatus | ''
}

export type EquipmentClientOption = {
  id: string
  name: string
}

export type EquipmentLocationOption = {
  id: string
  client_id: string
  name: string
  city: string
  state: string
}

export type EquipmentFormOptions = {
  clients: EquipmentClientOption[]
  locations: EquipmentLocationOption[]
  categories: string[]
}

export function getEquipmentStatusLabel(status: EquipmentStatus) {
  return EQUIPMENT_STATUSES.find((option) => option.value === status)?.label ?? status
}
