import type { MaintenanceRequestSummary, RequestStatus } from './types'

export type TimelineRequest = Pick<
  MaintenanceRequestSummary,
  'status' | 'created_at' | 'decided_at' | 'converted_at' | 'maintenance_status'
  | 'maintenance_scheduled_at' | 'maintenance_completed_at' | 'maintenance_cancelled_at'
>

export type TimelineStep = {
  label: string
  detail: string
  state: 'complete' | 'current' | 'upcoming' | 'cancelled'
  date?: string | null
}

function reviewedLabel(status: RequestStatus) {
  if (status === 'rejected') return 'Solicitação não aprovada'
  if (status === 'cancelled') return 'Solicitação cancelada'
  return 'Análise concluída'
}

export function getPortalTimelineSteps(request: TimelineRequest): TimelineStep[] {
  const steps: TimelineStep[] = [{ label: 'Solicitação enviada', detail: 'Recebida pela Zion', state: 'complete', date: request.created_at }]
  if (request.status === 'pending') {
    steps.push({ label: 'Em análise', detail: 'Aguardando avaliação técnica', state: 'current' })
    return steps
  }
  if (request.status === 'cancelled' || request.status === 'rejected') {
    steps.push({ label: reviewedLabel(request.status), detail: 'Fluxo encerrado', state: 'cancelled', date: request.decided_at })
    return steps
  }
  steps.push({ label: 'Análise concluída', detail: 'Atendimento aprovado', state: 'complete', date: request.decided_at })
  if (request.status === 'approved') {
    steps.push({ label: 'Criação da OS', detail: 'Próxima etapa', state: 'current' })
    return steps
  }
  steps.push({ label: 'OS criada', detail: 'Ordem de serviço aberta', state: 'complete', date: request.converted_at })
  if (request.maintenance_status === 'cancelled') {
    steps.push({ label: 'Atendimento cancelado', detail: 'OS encerrada sem conclusão', state: 'cancelled', date: request.maintenance_cancelled_at })
    return steps
  }
  const scheduledState = request.maintenance_status === 'completed' || request.maintenance_status === 'in_progress' ? 'complete' : 'current'
  steps.push({ label: request.maintenance_status === 'in_progress' ? 'Atendimento iniciado' : 'Atendimento previsto', detail: request.maintenance_status === 'draft' ? 'Próximo evento' : 'Execução técnica', state: scheduledState, date: request.maintenance_scheduled_at })
  steps.push(request.maintenance_status === 'completed'
    ? { label: 'Serviço concluído', detail: 'OS finalizada', state: 'complete', date: request.maintenance_completed_at }
    : { label: 'Conclusão', detail: 'Após a execução do serviço', state: request.maintenance_status === 'in_progress' ? 'current' : 'upcoming' })
  return steps
}
