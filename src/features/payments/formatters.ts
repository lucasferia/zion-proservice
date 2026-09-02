export function formatPaymentCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatPaymentDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: BUSINESS_TIMEZONE }).format(new Date(value))
}

export function formatPaymentDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

export function defaultPaidAt() {
  return businessDateTimeLocalValue(new Date())
}
import { BUSINESS_TIMEZONE, businessDateTimeLocalValue } from '../../lib/dateTime'
