import { describe, expect, it } from 'vitest'
import { describeReturnTiming, formatReturnDate, localDateValue } from './formatters'

describe('return schedule formatters', () => {
  it('descreve vencimento a partir da diferença calculada sem persistir novo status', () => {
    expect(describeReturnTiming(-1, true)).toBe('1 dia vencido')
    expect(describeReturnTiming(-4, true)).toBe('4 dias vencidos')
    expect(describeReturnTiming(0, false)).toBe('Hoje')
    expect(describeReturnTiming(1, false)).toBe('Amanhã')
    expect(describeReturnTiming(12, false)).toBe('Em 12 dias')
  })

  it('formata datas sem deslocamento de fuso horário', () => {
    expect(formatReturnDate('2026-09-01')).toMatch(/01 de set\. de 2026/i)
    expect(localDateValue(new Date(2026, 8, 1, 23, 30))).toBe('2026-09-01')
  })
})
