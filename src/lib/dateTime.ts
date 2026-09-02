export const BUSINESS_TIMEZONE = 'America/Sao_Paulo'

function zonedParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  return Object.fromEntries(parts.map((part) => [part.type, part.value]))
}

function dateParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(value)
  if (!match) throw new Error('Data local inválida.')
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4] ?? 0),
    minute: Number(match[5] ?? 0),
    second: Number(match[6] ?? 0),
  }
}

function timezoneOffset(date: Date) {
  const parts = zonedParts(date)
  const representedAsUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second),
  )
  return representedAsUtc - date.getTime()
}

export function businessDateTimeToIso(value: string) {
  const parts = dateParts(value)
  const wallClock = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  let instant = new Date(wallClock - timezoneOffset(new Date(wallClock)))
  instant = new Date(wallClock - timezoneOffset(instant))
  return instant.toISOString()
}

export function businessDateTimeLocalValue(value: string | Date) {
  const parts = zonedParts(value instanceof Date ? value : new Date(value))
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function businessDateValue(date = new Date()) {
  return businessDateTimeLocalValue(date).slice(0, 10)
}

export function businessDatePlusDays(days: number, date = new Date()) {
  const current = dateParts(businessDateValue(date))
  const shifted = new Date(Date.UTC(current.year, current.month - 1, current.day + days))
  return shifted.toISOString().slice(0, 10)
}

export function businessDateBoundary(value: string, exclusiveEnd = false) {
  if (!value) return null
  const base = dateParts(value)
  const shifted = new Date(Date.UTC(base.year, base.month - 1, base.day + (exclusiveEnd ? 1 : 0)))
  return businessDateTimeToIso(`${shifted.toISOString().slice(0, 10)}T00:00`)
}
