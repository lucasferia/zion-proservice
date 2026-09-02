import { describe, expect, it } from 'vitest'
import {
  dateInSaoPaulo,
  defaultDashboardPeriod,
  formatDashboardDateTime,
  formatReturnDistance,
} from './formatters'

describe('dashboard formatters', () => {
  it('resolve a data civil em America/Sao_Paulo na virada UTC', () => {
    const instant = new Date('2026-09-01T02:30:00.000Z')
    expect(dateInSaoPaulo(instant)).toBe('2026-08-31')
    expect(defaultDashboardPeriod(instant)).toEqual({ start: '2026-08-01', end: '2026-08-31' })
  })

  it('formata horário e distância operacional', () => {
    expect(formatDashboardDateTime('2026-09-01T02:30:00.000Z')).toMatch(/31 de ago\..*23:30/i)
    expect(formatReturnDistance(0)).toBe('Hoje')
    expect(formatReturnDistance(1)).toBe('Amanhã')
    expect(formatReturnDistance(7)).toBe('Em 7 dias')
  })
})
