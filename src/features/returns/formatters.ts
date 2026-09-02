import { businessDatePlusDays, businessDateValue } from '../../lib/dateTime'

export const localDateValue = businessDateValue

export function todayValue() {
  return businessDateValue()
}

export function datePlusDays(days: number) {
  return businessDatePlusDays(days)
}

export function formatReturnDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

export function describeReturnTiming(daysUntil: number, isOverdue: boolean) {
  if (isOverdue) return `${Math.abs(daysUntil)} ${Math.abs(daysUntil) === 1 ? 'dia vencido' : 'dias vencidos'}`
  if (daysUntil === 0) return 'Hoje'
  if (daysUntil === 1) return 'Amanhã'
  return `Em ${daysUntil} dias`
}
