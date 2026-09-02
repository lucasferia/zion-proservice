import { getPaymentStatusLabel, type PaymentStatus } from './types'

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={`payment-status payment-status--${status}`}>
      <span aria-hidden="true" />
      {getPaymentStatusLabel(status)}
    </span>
  )
}
