import type { FieldErrors } from '../clients/validation'
import type { EquipmentInput } from './types'

const equipmentStatuses = new Set([
  'operational',
  'attention',
  'under_maintenance',
  'inactive',
])

export function validateEquipment(input: EquipmentInput): FieldErrors<EquipmentInput> {
  const errors: FieldErrors<EquipmentInput> = {}
  const name = input.name.trim()
  const category = input.category.trim()
  const brand = input.brand.trim()
  const model = input.model.trim()
  const serialNumber = input.serial_number.trim()
  const assetTag = input.asset_tag.trim()

  if (name.length < 2) errors.name = 'Informe um nome com pelo menos 2 caracteres.'
  if (name.length > 160) errors.name = 'O nome deve ter no máximo 160 caracteres.'
  if (category.length < 2) errors.category = 'Informe uma categoria com pelo menos 2 caracteres.'
  if (category.length > 80) errors.category = 'A categoria deve ter no máximo 80 caracteres.'
  if (brand.length > 100) errors.brand = 'A marca deve ter no máximo 100 caracteres.'
  if (model.length > 120) errors.model = 'O modelo deve ter no máximo 120 caracteres.'
  if (serialNumber.length > 120) {
    errors.serial_number = 'O número de série deve ter no máximo 120 caracteres.'
  }
  if (assetTag.length > 80) errors.asset_tag = 'O patrimônio deve ter no máximo 80 caracteres.'
  if (!equipmentStatuses.has(input.status)) errors.status = 'Selecione um status válido.'
  if (input.notes.length > 2000) errors.notes = 'As observações devem ter no máximo 2.000 caracteres.'

  return errors
}
