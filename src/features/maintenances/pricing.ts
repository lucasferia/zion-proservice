import type { MaintenanceDiscountType } from './types'

export function roundMaintenanceCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateMaintenancePricing(
  laborAmount: number,
  materialAmount: number,
  discountType: MaintenanceDiscountType,
  discountValue: number,
) {
  const subtotal = roundMaintenanceCurrency(laborAmount + materialAmount)
  const discountAmount = discountType === 'percentage'
    ? roundMaintenanceCurrency(subtotal * discountValue / 100)
    : roundMaintenanceCurrency(discountValue)
  const total = roundMaintenanceCurrency(subtotal - discountAmount)

  return { subtotal, discountAmount, total }
}

export function maintenanceDiscountLabel(type: MaintenanceDiscountType, value: number) {
  if (type === 'percentage') {
    return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}%`
  }
  return 'Valor fixo'
}
