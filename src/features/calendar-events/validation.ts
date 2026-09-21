import { businessDateTimeToIso } from '../../lib/dateTime'
import type { FieldErrors } from '../clients/validation'
import type { CalendarEventInput, CalendarEventOptions } from './types'

export function validateCalendarEvent(input: CalendarEventInput, options: CalendarEventOptions) {
  const errors: FieldErrors<CalendarEventInput> = {}
  const title = input.title.trim()
  if (title.length < 2) errors.title = 'Informe um título com pelo menos 2 caracteres.'
  else if (title.length > 160) errors.title = 'Use no máximo 160 caracteres.'
  if (input.description.length > 3000) errors.description = 'Use no máximo 3.000 caracteres.'

  if (input.is_all_day) {
    if (!input.event_date) errors.event_date = 'Informe a data do evento.'
  } else {
    if (!input.starts_at) errors.starts_at = 'Informe a data e o horário de início.'
    if (input.ends_at && input.starts_at) {
      try {
        if (businessDateTimeToIso(input.ends_at) <= businessDateTimeToIso(input.starts_at)) {
          errors.ends_at = 'O término deve ser posterior ao início.'
        }
      } catch {
        errors.ends_at = 'Revise a data e o horário de término.'
      }
    }
  }

  if (input.client_id && !options.clients.some((item) => item.id === input.client_id)) {
    errors.client_id = 'O cliente selecionado não está disponível.'
  }
  if (input.client_location_id) {
    const location = options.locations.find((item) => item.id === input.client_location_id)
    if (!input.client_id || location?.client_id !== input.client_id) {
      errors.client_location_id = 'A unidade deve pertencer ao cliente selecionado.'
    }
  }
  if (input.equipment_id && !options.equipment.some((item) => item.id === input.equipment_id)) {
    errors.equipment_id = 'O equipamento selecionado não está disponível.'
  }
  if (input.maintenance_id) {
    const maintenance = options.maintenances.find((item) => item.id === input.maintenance_id)
    if (!maintenance) errors.maintenance_id = 'A OS selecionada não está disponível.'
    else {
      if (input.client_id && input.client_id !== maintenance.client_id) errors.client_id = 'O cliente deve corresponder à OS.'
      if (input.client_location_id && input.client_location_id !== maintenance.client_location_id) errors.client_location_id = 'A unidade deve corresponder à OS.'
      if (input.equipment_id && input.equipment_id !== maintenance.equipment_id) errors.equipment_id = 'O equipamento deve corresponder à OS.'
    }
  }
  return errors
}

export function validateCalendarEventCancellation(reason: string) {
  const normalized = reason.trim()
  if (normalized.length < 3) return 'Informe um motivo com pelo menos 3 caracteres.'
  if (normalized.length > 500) return 'Use no máximo 500 caracteres.'
  return null
}
