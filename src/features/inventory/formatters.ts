export function formatInventoryQuantity(value: number, unit?: string) {
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value)
  return unit ? `${formatted} ${unit}` : formatted
}

export function formatInventoryCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatMovementDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: BUSINESS_TIMEZONE,
  }).format(new Date(value))
}
import { BUSINESS_TIMEZONE } from '../../lib/dateTime'
