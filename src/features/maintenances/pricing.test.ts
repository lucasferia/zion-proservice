import { describe, expect, it } from 'vitest'
import { calculateMaintenancePricing, roundMaintenanceCurrency } from './pricing'

describe('precificação da manutenção', () => {
  it('aplica percentual uma única vez sobre o subtotal completo', () => {
    expect(calculateMaintenancePricing(600, 400, 'percentage', 10)).toEqual({
      subtotal: 1000,
      discountAmount: 100,
      total: 900,
    })
  })

  it('mantém desconto fixo enquanto o subtotal muda', () => {
    expect(calculateMaintenancePricing(600, 400, 'fixed', 150)).toEqual({
      subtotal: 1000,
      discountAmount: 150,
      total: 850,
    })
    expect(calculateMaintenancePricing(500, 300, 'fixed', 150)).toEqual({
      subtotal: 800,
      discountAmount: 150,
      total: 650,
    })
  })

  it('arredonda o desconto percentual para centavos sem acumular', () => {
    expect(calculateMaintenancePricing(0, 10.01, 'percentage', 33.3333)).toEqual({
      subtotal: 10.01,
      discountAmount: 3.34,
      total: 6.67,
    })
    expect(roundMaintenanceCurrency(0.1 + 0.2)).toBe(0.3)
  })

  it('preserva o comportamento sem desconto', () => {
    expect(calculateMaintenancePricing(320, 180, 'percentage', 0)).toEqual({
      subtotal: 500,
      discountAmount: 0,
      total: 500,
    })
  })
})
