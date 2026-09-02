import type { FieldErrors } from '../clients/validation'
import type { InventoryItemInput, InventoryMovementInput } from './types'

function parseDecimal(value: string) {
  const normalized = value.trim().replace(',', '.')
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function hasAtMostDecimals(value: string, decimals: number) {
  const normalized = value.trim().replace(',', '.')
  const [, decimalPart = ''] = normalized.split('.')
  return decimalPart.length <= decimals
}

export function validateInventoryItem(
  input: InventoryItemInput,
): FieldErrors<InventoryItemInput> {
  const errors: FieldErrors<InventoryItemInput> = {}
  const name = input.name.trim()
  const sku = input.sku.trim()
  const category = input.category.trim()
  const unit = input.unit_of_measure.trim()
  const minimumStock = parseDecimal(input.minimum_stock)
  const averageCost = parseDecimal(input.average_unit_cost)

  if (name.length < 2) errors.name = 'Informe um nome com pelo menos 2 caracteres.'
  if (name.length > 160) errors.name = 'O nome deve ter no máximo 160 caracteres.'
  if (sku.length > 80) errors.sku = 'O SKU deve ter no máximo 80 caracteres.'
  if (category && category.length < 2) errors.category = 'A categoria deve ter pelo menos 2 caracteres.'
  if (category.length > 80) errors.category = 'A categoria deve ter no máximo 80 caracteres.'
  if (!unit) errors.unit_of_measure = 'Informe a unidade de medida.'
  if (unit.length > 30) errors.unit_of_measure = 'A unidade deve ter no máximo 30 caracteres.'
  if (minimumStock === null || Number.isNaN(minimumStock) || minimumStock < 0) {
    errors.minimum_stock = 'Informe um estoque mínimo igual ou maior que zero.'
  } else if (!hasAtMostDecimals(input.minimum_stock, 3)) {
    errors.minimum_stock = 'Use no máximo 3 casas decimais.'
  }
  if (averageCost === null || Number.isNaN(averageCost) || averageCost < 0) {
    errors.average_unit_cost = 'Informe um custo igual ou maior que zero.'
  } else if (!hasAtMostDecimals(input.average_unit_cost, 4)) {
    errors.average_unit_cost = 'Use no máximo 4 casas decimais.'
  }
  if (!['active', 'inactive'].includes(input.status)) errors.status = 'Selecione um status válido.'
  if (input.notes.length > 2000) errors.notes = 'As observações devem ter no máximo 2.000 caracteres.'

  return errors
}

export function validateInventoryMovement(
  input: InventoryMovementInput,
): FieldErrors<InventoryMovementInput> {
  const errors: FieldErrors<InventoryMovementInput> = {}
  const quantity = parseDecimal(input.quantity)
  const unitCost = parseDecimal(input.unit_cost)
  const reason = input.reason.trim()

  if (quantity === null || Number.isNaN(quantity) || quantity <= 0) {
    errors.quantity = 'Informe uma quantidade maior que zero.'
  } else if (!hasAtMostDecimals(input.quantity, 3)) {
    errors.quantity = 'Use no máximo 3 casas decimais.'
  }
  if (input.movement_type === 'adjustment' && reason.length < 3) {
    errors.reason = 'Explique o motivo do ajuste com pelo menos 3 caracteres.'
  }
  if (reason.length > 500) errors.reason = 'O motivo deve ter no máximo 500 caracteres.'
  if (input.movement_type === 'entry' && input.unit_cost.trim()) {
    if (unitCost === null || Number.isNaN(unitCost) || unitCost < 0) {
      errors.unit_cost = 'Informe um custo igual ou maior que zero.'
    } else if (!hasAtMostDecimals(input.unit_cost, 4)) {
      errors.unit_cost = 'Use no máximo 4 casas decimais.'
    }
  }

  return errors
}

export function decimalValue(value: string) {
  return Number(value.trim().replace(',', '.'))
}
