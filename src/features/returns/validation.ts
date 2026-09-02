import type { FieldErrors } from '../clients/validation'
import { todayValue } from './formatters'
import type { ReturnScheduleInput, ReturnScheduleOptions } from './types'

export function validateReturnSchedule(input: ReturnScheduleInput, options: ReturnScheduleOptions) {
  const errors: FieldErrors<ReturnScheduleInput> = {}
  const equipment = options.equipment.find((item) => item.id === input.equipment_id)

  if (!input.client_id) errors.client_id = 'Selecione o cliente.'
  if (!equipment) {
    errors.equipment_id = 'Selecione um equipamento ativo.'
  }
  if (input.client_location_id && !options.locations.some(
    (location) => location.id === input.client_location_id && location.client_id === input.client_id,
  )) errors.client_location_id = 'A unidade deve pertencer ao cliente selecionado.'
  if (!input.scheduled_date) errors.scheduled_date = 'Informe a data do retorno.'
  else if (input.scheduled_date < todayValue()) errors.scheduled_date = 'A data não pode estar no passado.'
  if (input.notes.length > 2000) errors.notes = 'As observações devem ter no máximo 2.000 caracteres.'
  return errors
}

export function validateReturnCancellation(reason: string) {
  const value = reason.trim()
  if (value.length < 3) return 'Informe um motivo com pelo menos 3 caracteres.'
  if (value.length > 500) return 'O motivo deve ter no máximo 500 caracteres.'
  return null
}
