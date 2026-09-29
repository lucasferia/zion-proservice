import type { RequestCriticality } from './types'

export const MAX_REQUEST_PHOTOS = 5

export function validateMaintenanceRequest(input: { equipmentId: string; title: string; description: string; criticality: string }) {
  const errors: Record<string, string> = {}
  if (!input.equipmentId) errors.equipmentId = 'Selecione o equipamento que precisa de atendimento.'
  const titleLength = input.title.trim().length
  if (titleLength < 5 || titleLength > 160) errors.title = 'Use um título entre 5 e 160 caracteres.'
  const descriptionLength = input.description.trim().length
  if (descriptionLength < 10 || descriptionLength > 4000) errors.description = 'Descreva a situação em 10 a 4000 caracteres.'
  if (!(['low', 'medium', 'high', 'critical'] as string[]).includes(input.criticality)) errors.criticality = 'Selecione uma criticidade percebida válida.'
  return errors
}

export function criticalityLabel(value: RequestCriticality) {
  return ({ low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica' })[value]
}

export function requestStatusLabel(value: string) {
  return ({ pending: 'Pendente', cancelled: 'Cancelada', approved: 'Aprovada', rejected: 'Rejeitada', converted: 'Convertida' } as Record<string, string>)[value] ?? value
}
