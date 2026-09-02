import type { FieldErrors } from '../clients/validation'
import type { PaymentInput } from './types'

export function parsePaymentAmount(value: string) {
  const normalized = value.trim().replace(',', '.')
  if (!normalized) return Number.NaN
  return Number(normalized)
}

function hasAtMostTwoDecimals(value: string) {
  const normalized = value.trim().replace(',', '.')
  return (normalized.split('.')[1]?.length ?? 0) <= 2
}

export function validatePayment(input: PaymentInput, availableAmount: number) {
  const errors: FieldErrors<PaymentInput> = {}
  const amount = parsePaymentAmount(input.amount)

  if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'Informe um valor maior que zero.'
  } else if (!hasAtMostTwoDecimals(input.amount)) {
    errors.amount = 'Use no máximo 2 casas decimais.'
  } else if (amount > availableAmount + 0.001) {
    errors.amount = 'O valor ultrapassa o limite ainda disponível na OS.'
  }

  if (input.status === 'received' && !input.paid_at) {
    errors.paid_at = 'Informe quando o pagamento foi recebido.'
  }
  if (input.status === 'pending' && !input.due_date) {
    errors.due_date = 'Informe a data prevista para esta cobrança.'
  }
  if (input.notes.length > 2000) {
    errors.notes = 'As observações devem ter no máximo 2.000 caracteres.'
  }
  return errors
}

export function validatePaymentCancellation(reason: string) {
  const normalized = reason.trim()
  if (normalized.length < 3) return 'Informe um motivo com pelo menos 3 caracteres.'
  if (normalized.length > 500) return 'O motivo deve ter no máximo 500 caracteres.'
  return null
}
