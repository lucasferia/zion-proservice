import { BUSINESS_TIMEZONE, businessDateTimeLocalValue } from '../../lib/dateTime'

export function formatMaintenanceDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: BUSINESS_TIMEZONE,
  }).format(new Date(value))
}

export function formatMaintenanceCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function toDateTimeLocal(value: string) {
  return businessDateTimeLocalValue(value)
}

export function defaultScheduledAt() {
  const local = businessDateTimeLocalValue(new Date())
  const surrogate = new Date(`${local}:00Z`)
  surrogate.setUTCMinutes(Math.ceil(surrogate.getUTCMinutes() / 15) * 15, 0, 0)
  return surrogate.toISOString().slice(0, 16)
}
