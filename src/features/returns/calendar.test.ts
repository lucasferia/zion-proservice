import { describe, expect, it } from 'vitest'
import { calendarDays, monthRange, shiftMonth } from './calendar'

describe('calendário de retornos', () => {
  it('monta uma grade mensal completa com 42 dias', () => {
    const days = calendarDays('2026-09')
    expect(days).toHaveLength(42)
    expect(days[0]).toEqual({ date: '2026-08-30', inMonth: false })
    expect(days[2]).toEqual({ date: '2026-09-01', inMonth: true })
    expect(days.at(-1)).toEqual({ date: '2026-10-10', inMonth: false })
  })

  it('navega entre anos e calcula os limites do mês', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(monthRange('2028-02')).toEqual({ periodStart: '2028-02-01', periodEnd: '2028-02-29' })
  })
})
