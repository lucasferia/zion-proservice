import { BUSINESS_TIMEZONE, businessDateValue } from '../../lib/dateTime'
import type { DashboardPeriod } from './types'

export const DASHBOARD_TIMEZONE = BUSINESS_TIMEZONE

export function dateInSaoPaulo(date = new Date()) {
  return businessDateValue(date)
}

export function defaultDashboardPeriod(date = new Date()): DashboardPeriod {
  const end = dateInSaoPaulo(date)
  return { start: `${end.slice(0, 7)}-01`, end }
}

export function formatDashboardDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

export function formatDashboardDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: DASHBOARD_TIMEZONE,
  }).format(new Date(value))
}

export function formatDashboardCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(Number(value))
}

export function formatPeriodLabel(period: DashboardPeriod) {
  if (period.start === period.end) return formatDashboardDate(period.start)
  return `${formatDashboardDate(period.start)} — ${formatDashboardDate(period.end)}`
}

export function formatReturnDistance(daysUntil: number) {
  if (daysUntil === 0) return 'Hoje'
  if (daysUntil === 1) return 'Amanhã'
  return `Em ${daysUntil} dias`
}
