import { describe, expect, it } from 'vitest'
import { datePlusDays } from '../returns/formatters'
import type { MaintenanceInput } from './types'
import {
  validateCompletion,
  validateMaintenance,
  validateMaintenancePart,
} from './validation'

const validInput: MaintenanceInput = {
  client_id: 'client-a',
  client_location_id: 'location-a',
  equipment_id: 'equipment-a',
  maintenance_type: 'corrective',
  status: 'draft',
  scheduled_at: '2026-08-31T14:00',
  next_return_date: datePlusDays(30),
  diagnosis: 'Correia desgastada',
  service_performed: 'Substituição da correia',
  notes: '',
  responsible_technician_id: 'user-a',
  total_amount: '350,50',
}

describe('validações de manutenção', () => {
  it('aceita uma ordem de serviço válida com decimal brasileiro', () => {
    expect(validateMaintenance(validInput)).toEqual({})
  })

  it('exige os vínculos e a data do atendimento', () => {
    const errors = validateMaintenance({
      ...validInput,
      client_id: '',
      equipment_id: '',
      responsible_technician_id: '',
      scheduled_at: '',
    })
    expect(errors.client_id).toBeTruthy()
    expect(errors.equipment_id).toBeTruthy()
    expect(errors.responsible_technician_id).toBeTruthy()
    expect(errors.scheduled_at).toBeTruthy()
  })

  it('bloqueia peça acima do saldo disponível', () => {
    expect(validateMaintenancePart({ inventory_item_id: 'item-a', quantity: '4' }, 3).quantity)
      .toContain('Saldo disponível')
  })

  it('aceita quantidade fracionada dentro do saldo', () => {
    expect(validateMaintenancePart({ inventory_item_id: 'item-a', quantity: '1,5' }, 3))
      .toEqual({})
  })

  it('impede conclusão sem relatório ou com peça sem saldo', () => {
    expect(validateCompletion({
      diagnosis: '',
      service_performed: null,
      next_return_date: null,
      parts: [{ quantity: 4, available_quantity: 2, item_name: 'Correia' }],
    })).toEqual([
      'Informe o diagnóstico.',
      'Informe o serviço realizado.',
      'Informe a data de reagendamento no relatório.',
      'Correia: saldo insuficiente.',
    ])
  })
})
