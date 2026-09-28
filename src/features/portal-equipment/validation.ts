import type { FieldErrors } from '../clients/validation'
import { validateEquipment } from '../equipment/validation'
import type { PortalEquipmentInput } from './types'

export function validatePortalEquipment(input: PortalEquipmentInput): FieldErrors<PortalEquipmentInput> {
  const errors = validateEquipment({ ...input, status: 'operational' })
  const portalErrors: FieldErrors<PortalEquipmentInput> = {}
  for (const key of ['name', 'category', 'brand', 'model', 'serial_number', 'asset_tag', 'notes'] as const) {
    if (errors[key]) portalErrors[key] = errors[key]
  }
  return portalErrors
}
