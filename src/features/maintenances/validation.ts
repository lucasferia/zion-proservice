import type { FieldErrors } from '../clients/validation'
import type { MaintenanceInput, MaintenancePartInput } from './types'

export function parseDecimal(value: string) {
  const normalized = value.trim().replace(',', '.')
  if (!normalized) return Number.NaN
  return Number(normalized)
}

export function validateMaintenance(input: MaintenanceInput): FieldErrors<MaintenanceInput> {
  const errors: FieldErrors<MaintenanceInput> = {}
  const amount = parseDecimal(input.total_amount)

  if (!input.client_id) errors.client_id = 'Selecione um cliente.'
  if (!input.equipment_id) errors.equipment_id = 'Selecione o equipamento atendido.'
  if (!input.responsible_technician_id) {
    errors.responsible_technician_id = 'Selecione o técnico responsável.'
  }
  if (!input.scheduled_at || Number.isNaN(new Date(input.scheduled_at).getTime())) {
    errors.scheduled_at = 'Informe uma data e hora válidas.'
  }
  if (!['preventive', 'corrective'].includes(input.maintenance_type)) {
    errors.maintenance_type = 'Selecione um tipo válido.'
  }
  if (!['draft', 'in_progress'].includes(input.status)) {
    errors.status = 'Selecione um status aberto válido.'
  }
  if (input.diagnosis.length > 4000) errors.diagnosis = 'O diagnóstico deve ter no máximo 4.000 caracteres.'
  if (input.service_performed.length > 6000) {
    errors.service_performed = 'O serviço realizado deve ter no máximo 6.000 caracteres.'
  }
  if (input.notes.length > 3000) errors.notes = 'As observações devem ter no máximo 3.000 caracteres.'
  if (!Number.isFinite(amount) || amount < 0 || amount > 999999999999.99) {
    errors.total_amount = 'Informe um valor válido, igual ou maior que zero.'
  }

  return errors
}

export function validateMaintenancePart(
  input: MaintenancePartInput,
  availableQuantity: number | null,
) {
  const errors: FieldErrors<MaintenancePartInput> = {}
  const quantity = parseDecimal(input.quantity)

  if (!input.inventory_item_id) errors.inventory_item_id = 'Selecione um item do estoque.'
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 99999999999.999) {
    errors.quantity = 'Informe uma quantidade maior que zero.'
  } else if (availableQuantity !== null && quantity > availableQuantity) {
    errors.quantity = `Saldo disponível: ${availableQuantity.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}.`
  }

  return errors
}

export function validateCompletion(details: {
  diagnosis: string | null
  service_performed: string | null
  parts: Array<{ quantity: number; available_quantity: number; item_name: string }>
}) {
  const errors: string[] = []
  if ((details.diagnosis ?? '').trim().length < 3) errors.push('Informe o diagnóstico.')
  if ((details.service_performed ?? '').trim().length < 3) errors.push('Informe o serviço realizado.')
  for (const part of details.parts) {
    if (part.quantity > part.available_quantity) {
      errors.push(`${part.item_name}: saldo insuficiente.`)
    }
  }
  return errors
}
