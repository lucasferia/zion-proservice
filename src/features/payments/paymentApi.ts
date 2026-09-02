import { getSupabaseClient } from '../../lib/supabase'
import { businessDateBoundary, businessDateTimeToIso } from '../../lib/dateTime'
import { friendlyDataError } from '../clients/clientApi'
import type {
  FinancialClientOption,
  MaintenancePayment,
  PaymentFilters,
  PaymentInput,
  PaymentRecord,
  PaymentSummary,
  RevenueSummary,
} from './types'
import { parsePaymentAmount } from './validation'

function requireClient() {
  const client = getSupabaseClient()
  if (!client) throw new Error('A integração com o Supabase não está configurada.')
  return client
}

function dateBoundary(value: string, exclusiveEnd = false) {
  return businessDateBoundary(value, exclusiveEnd)
}

export function friendlyPaymentError(error: { code?: string; message?: string } | null) {
  if (!error) return 'Não foi possível concluir a operação financeira.'
  const message = error.message ?? ''
  const safeFragments = [
    'soma dos pagamentos ativos',
    'valor da OS não pode ficar abaixo',
    'Pagamentos recebidos ou cancelados são imutáveis',
    'Somente pagamentos pendentes',
    'já está cancelado',
    'Não é possível registrar pagamento em uma manutenção cancelada',
    'Informe um motivo entre',
  ]
  if (safeFragments.some((fragment) => message.includes(fragment))) return message
  if (error.code === '23514') return 'Revise o valor, o status e as datas informadas.'
  if (error.code === '23503') return 'A manutenção ou o cliente não está mais disponível.'
  return friendlyDataError(error)
}

export async function searchPayments(
  organizationId: string,
  search: string,
  filters: PaymentFilters,
) {
  const supabase = requireClient()
  const { data, error } = await supabase.rpc('search_payments', {
    target_organization_id: organizationId,
    search_term: search.trim() || null,
    period_start: dateBoundary(filters.periodStart),
    period_end: dateBoundary(filters.periodEnd, true),
    filter_client_id: filters.clientId || null,
    filter_method: filters.method || null,
    filter_status: filters.status || null,
  })
  if (error) throw new Error(friendlyPaymentError(error))
  return (data ?? []) as PaymentRecord[]
}

export async function getReceivedRevenue(
  organizationId: string,
  periodStart = '',
  periodEnd = '',
) {
  const supabase = requireClient()
  const { data, error } = await supabase.rpc('get_received_revenue', {
    target_organization_id: organizationId,
    period_start: dateBoundary(periodStart),
    period_end: dateBoundary(periodEnd, true),
  })
  if (error) throw new Error(friendlyPaymentError(error))
  return (data?.[0] ?? { total_received: 0, payment_count: 0 }) as RevenueSummary
}

export async function getFinancialClients(organizationId: string) {
  const supabase = requireClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id, name')
    .eq('organization_id', organizationId)
    .order('name')
  if (error) throw new Error(friendlyPaymentError(error))
  return (data ?? []) as FinancialClientOption[]
}

export async function getMaintenancePayments(organizationId: string, maintenanceId: string) {
  const supabase = requireClient()
  const [payments, summary] = await Promise.all([
    supabase
      .from('payments')
      .select('id, organization_id, client_id, maintenance_id, amount, method, status, paid_at, due_date, notes, created_at, created_by, cancelled_at, cancelled_by, cancellation_reason')
      .eq('organization_id', organizationId)
      .eq('maintenance_id', maintenanceId)
      .order('created_at', { ascending: false }),
    supabase.rpc('get_maintenance_payment_summary', {
      target_organization_id: organizationId,
      target_maintenance_id: maintenanceId,
    }),
  ])
  const error = payments.error ?? summary.error
  if (error) throw new Error(friendlyPaymentError(error))
  return {
    payments: (payments.data ?? []) as MaintenancePayment[],
    summary: (summary.data?.[0] ?? null) as PaymentSummary | null,
  }
}

export async function createPayment(
  organizationId: string,
  clientId: string,
  maintenanceId: string,
  input: PaymentInput,
) {
  const supabase = requireClient()
  const { error } = await supabase.from('payments').insert({
    organization_id: organizationId,
    client_id: clientId,
    maintenance_id: maintenanceId,
    amount: parsePaymentAmount(input.amount),
    method: input.method,
    status: input.status,
    paid_at: input.status === 'received' ? businessDateTimeToIso(input.paid_at) : null,
    due_date: input.status === 'pending' ? input.due_date : input.due_date || null,
    notes: input.notes.trim() || null,
  })
  if (error) throw new Error(friendlyPaymentError(error))
}

export async function receivePayment(
  organizationId: string,
  paymentId: string,
  receivedAt: string,
) {
  const supabase = requireClient()
  const { error } = await supabase.rpc('receive_payment', {
    target_organization_id: organizationId,
    target_payment_id: paymentId,
    received_at: businessDateTimeToIso(receivedAt),
  })
  if (error) throw new Error(friendlyPaymentError(error))
}

export async function cancelPayment(organizationId: string, paymentId: string, reason: string) {
  const supabase = requireClient()
  const { error } = await supabase.rpc('cancel_payment', {
    target_organization_id: organizationId,
    target_payment_id: paymentId,
    cancellation_reason: reason.trim(),
  })
  if (error) throw new Error(friendlyPaymentError(error))
}
