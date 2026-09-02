export const INVENTORY_SITUATIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'attention', label: 'Atenção' },
  { value: 'critical', label: 'Crítico' },
  { value: 'out_of_stock', label: 'Sem estoque' },
] as const

export const INVENTORY_ITEM_STATUSES = [
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
] as const

export type InventorySituation = (typeof INVENTORY_SITUATIONS)[number]['value']
export type InventoryItemStatus = (typeof INVENTORY_ITEM_STATUSES)[number]['value']
export type InventoryMovementType = 'entry' | 'adjustment' | 'maintenance_use'

export type InventoryItemSummary = {
  id: string
  organization_id: string
  name: string
  sku: string | null
  category: string | null
  unit_of_measure: string
  current_quantity: number
  minimum_stock: number
  average_unit_cost: number
  status: InventoryItemStatus
  notes: string | null
  stock_situation: InventorySituation
  created_at: string
  updated_at: string
}

export type InventoryMovement = {
  id: string
  organization_id: string
  inventory_item_id: string
  movement_type: InventoryMovementType
  quantity_delta: number
  previous_quantity: number
  resulting_quantity: number
  unit_cost: number | null
  reason: string | null
  created_by: string
  created_by_name: string
  created_at: string
}

export type InventoryItemDetails = InventoryItemSummary & {
  movements: InventoryMovement[]
}

export type InventoryItemInput = {
  name: string
  sku: string
  category: string
  unit_of_measure: string
  minimum_stock: string
  average_unit_cost: string
  status: InventoryItemStatus
  notes: string
}

export type InventoryFilters = {
  category: string
  situation: InventorySituation | ''
}

export type InventoryOptions = {
  categories: string[]
  units: string[]
}

export type InventoryMovementInput = {
  movement_type: InventoryMovementType
  direction: 'increase' | 'decrease'
  quantity: string
  reason: string
  unit_cost: string
}

export type InventoryMovementResult = {
  movement_id: string
  previous_quantity: number
  resulting_quantity: number
  average_unit_cost: number
}

export function getInventorySituationLabel(situation: InventorySituation) {
  return INVENTORY_SITUATIONS.find((item) => item.value === situation)?.label ?? situation
}

export function getInventoryItemStatusLabel(status: InventoryItemStatus) {
  return INVENTORY_ITEM_STATUSES.find((item) => item.value === status)?.label ?? status
}
