import { describe, expect, it } from 'vitest'
import { criticalityLabel, MAX_REQUEST_PHOTOS, requestStatusLabel, validateMaintenanceRequest } from './maintenanceRequestValidation'

describe('validação de solicitação de manutenção', () => {
  it('bloqueia envio incompleto sem depender do frontend visual', () => {
    expect(validateMaintenanceRequest({ equipmentId: '', title: 'Ruim', description: 'curta', criticality: 'urgent' })).toEqual({
      equipmentId: 'Selecione o equipamento que precisa de atendimento.',
      title: 'Use um título entre 5 e 160 caracteres.',
      description: 'Descreva a situação em 10 a 4000 caracteres.',
      criticality: 'Selecione uma criticidade percebida válida.',
    })
  })

  it('aceita os quatro níveis como percepção da academia', () => {
    for (const criticality of ['low', 'medium', 'high', 'critical']) {
      expect(validateMaintenanceRequest({ equipmentId: 'equipment-a', title: 'Ruído na esteira', description: 'O ruído aparece durante a corrida.', criticality })).toEqual({})
    }
    expect(criticalityLabel('critical')).toBe('Crítica')
    expect(requestStatusLabel('pending')).toBe('Pendente')
    expect(MAX_REQUEST_PHOTOS).toBe(5)
  })
})
