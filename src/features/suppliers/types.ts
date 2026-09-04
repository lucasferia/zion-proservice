export const SUPPLIER_STATUSES = [
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
] as const

export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number]['value']

export type Supplier = {
  id: string
  organization_id: string
  legal_name: string
  trade_name: string | null
  tax_id: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  status: SupplierStatus
  created_at: string
  updated_at: string
}

export type SupplierInput = {
  legal_name: string
  trade_name: string
  tax_id: string
  contact_name: string
  phone: string
  email: string
  address: string
  notes: string
  status: SupplierStatus
}

export type SupplierInventoryItem = {
  id: string
  name: string
  sku: string | null
  unit_of_measure: string
  current_quantity: number
  status: 'active' | 'inactive'
  supplier_id: string | null
}

export function supplierToInput(supplier: Supplier): SupplierInput {
  return {
    legal_name: supplier.legal_name,
    trade_name: supplier.trade_name ?? '',
    tax_id: supplier.tax_id ?? '',
    contact_name: supplier.contact_name ?? '',
    phone: supplier.phone ?? '',
    email: supplier.email ?? '',
    address: supplier.address ?? '',
    notes: supplier.notes ?? '',
    status: supplier.status,
  }
}

export function supplierStatusLabel(status: SupplierStatus) {
  return SUPPLIER_STATUSES.find((item) => item.value === status)?.label ?? status
}
