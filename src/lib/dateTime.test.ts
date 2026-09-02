import { describe, expect, it } from 'vitest'
import {
  businessDateBoundary,
  businessDatePlusDays,
  businessDateTimeLocalValue,
  businessDateTimeToIso,
  businessDateValue,
} from './dateTime'

describe('business timezone helpers', () => {
  it('classifica a virada UTC pela data civil de São Paulo', () => {
    const instant = new Date('2026-09-01T02:30:00.000Z')
    expect(businessDateValue(instant)).toBe('2026-08-31')
    expect(businessDateTimeLocalValue(instant)).toBe('2026-08-31T23:30')
  })

  it('converte campos locais para instantes e limites de consulta', () => {
    expect(businessDateTimeToIso('2026-09-01T00:00')).toBe('2026-09-01T03:00:00.000Z')
    expect(businessDateBoundary('2026-09-01')).toBe('2026-09-01T03:00:00.000Z')
    expect(businessDateBoundary('2026-09-01', true)).toBe('2026-09-02T03:00:00.000Z')
  })

  it('soma dias civis sem depender do timezone do dispositivo', () => {
    expect(businessDatePlusDays(1, new Date('2026-09-01T02:30:00.000Z'))).toBe('2026-09-01')
  })
})
