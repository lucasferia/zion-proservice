export const PAYMENT_METHODS = [
  { value: 'pix', label: 'Pix' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'credit_card', label: 'Cartão de crédito' },
  { value: 'debit_card', label: 'Cartão de débito' },
  { value: 'bank_transfer', label: 'Transferência bancária' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'other', label: 'Outro' },
] as const

export const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pendente' },
  { value: 'received', label: 'Recebido' },
  { value: 'cancelled', label: 'Cancelado' },
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value']
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]['value']

export type PaymentRecord = {
  id: string
  organization_id: string
  client_id: string
  client_name: string
  maintenance_id: string
  work_order_number: string
  equipment_name: string
  maintenance_total: number
  amount: number
  method: PaymentMethod
  status: PaymentStatus
  paid_at: string | null
  due_date: string | null
  notes: string | null
  created_at: string
  created_by: string
  cancelled_at: string | null
  cancelled_by: string | null
  cancellation_reason: string | null
  reference_at: string
}

export type MaintenancePayment = Omit<
  PaymentRecord,
  'client_name' | 'work_order_number' | 'equipment_name' | 'maintenance_total' | 'reference_at'
>

export type PaymentSummary = {
  maintenance_total: number
  active_total: number
  received_total: number
  pending_total: number
  balance_amount: number
}

export type RevenueSummary = {
  total_received: number
  payment_count: number
}

export type PaymentInput = {
  amount: string
  method: PaymentMethod
  status: Extract<PaymentStatus, 'pending' | 'received'>
  paid_at: string
  due_date: string
  notes: string
}

export type PaymentFilters = {
  periodStart: string
  periodEnd: string
  clientId: string
  method: PaymentMethod | ''
  status: PaymentStatus | ''
}

export type FinancialClientOption = { id: string; name: string }

export function getPaymentMethodLabel(method: PaymentMethod) {
  return PAYMENT_METHODS.find((option) => option.value === method)?.label ?? method
}

export function getPaymentStatusLabel(status: PaymentStatus) {
  return PAYMENT_STATUSES.find((option) => option.value === status)?.label ?? status
}
