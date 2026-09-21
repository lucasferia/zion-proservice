import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { archiveCalendarEvent, cancelCalendarEvent, completeCalendarEvent } from './calendarEventApi'
import { calendarEventKeys, useCalendarEventDetails } from './calendarEventQueries'
import { CalendarEventStatusBadge } from './CalendarEventStatusBadge'
import { calendarEventDate, formatAuditInstant, formatCalendarEventDate, formatCalendarEventTime } from './formatters'
import { calendarEventTypeLabel } from './types'
import { validateCalendarEventCancellation } from './validation'

export function CalendarEventDetailsPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { organization, event, options } = useCalendarEventDetails(eventId)
  const [action, setAction] = useState<'complete' | 'cancel' | 'archive' | null>(null)
  const [reason, setReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const error = organization.error ?? event.error ?? options.error
  const success = (location.state as { success?: string } | null)?.success

  if (organization.isLoading || event.isLoading || options.isLoading) return <PageSkeleton rows={5} />
  if (error || !organization.data || !event.data || !options.data) return <PageState title="Evento indisponível" description={error?.message ?? 'Evento não encontrado ou arquivado.'} actionLabel="Voltar para agenda" onAction={() => navigate('/app/agenda')} tone="error" />

  const data = event.data
  const canManage = options.data.canManage

  async function run(operation: () => Promise<void>, nextMessage: string, leave = false) {
    if (busy) return
    setBusy(true); setActionError(null)
    try {
      await operation()
      await queryClient.invalidateQueries({ queryKey: calendarEventKeys.all })
      if (leave) navigate('/app/agenda', { replace: true, state: { success: nextMessage } })
      else {
        setAction(null)
        navigate(`/app/agenda/eventos/${data.id}`, { replace: true, state: { success: nextMessage } })
      }
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Não foi possível atualizar o evento.')
    } finally { setBusy(false) }
  }

  function handleCancel() {
    const validation = validateCalendarEventCancellation(reason)
    if (validation) { setActionError(validation); return }
    void run(() => cancelCalendarEvent(organization.data!, data.id, reason), 'Evento cancelado e motivo preservado.')
  }

  return (
    <section className="calendar-event-details" aria-labelledby="calendar-event-title">
      <Link className="back-link" to="/app/agenda">← Voltar para agenda</Link>
      {success && <div className="alert alert--success" role="status">{success}</div>}
      <header className="calendar-event-details__hero">
        <div>
          <span className="eyebrow">{calendarEventTypeLabel(data.event_type)}</span>
          <h1 id="calendar-event-title">{data.title}</h1>
          <p>{formatCalendarEventDate(calendarEventDate(data))} · {formatCalendarEventTime(data)}</p>
        </div>
        <CalendarEventStatusBadge status={data.status} />
      </header>

      <div className="calendar-event-details__layout">
        <article className="calendar-event-details__main">
          <section><span className="eyebrow">Descrição</span><h2>Contexto do compromisso</h2><p>{data.description || 'Nenhuma descrição informada.'}</p></section>
          <section><span className="eyebrow">Vínculos</span><h2>Referências operacionais</h2>
            <dl className="record-details-grid">
              <div><dt>Cliente</dt><dd>{data.client_name || 'Sem vínculo'}</dd></div>
              <div><dt>Unidade</dt><dd>{data.location_name ? `${data.location_name}${data.location_city ? ` · ${data.location_city}` : ''}` : 'Sem vínculo'}</dd></div>
              <div><dt>Equipamento</dt><dd>{data.equipment_name || 'Sem vínculo'}</dd></div>
              <div><dt>Ordem de serviço</dt><dd>{data.work_order_number || 'Sem vínculo'}</dd></div>
            </dl>
            <div className="calendar-event-details__links">
              {data.client_id && <Link to={`/app/clientes/${data.client_id}`}>Abrir cliente</Link>}
              {data.equipment_id && <Link to={`/app/equipamentos/${data.equipment_id}`}>Abrir equipamento</Link>}
              {data.maintenance_id && <Link to={`/app/manutencoes/${data.maintenance_id}`}>Abrir OS</Link>}
            </div>
          </section>
          {data.status === 'cancelled' && <section className="calendar-event-details__cancel"><span className="eyebrow">Cancelamento</span><h2>Motivo registrado</h2><p>{data.cancellation_reason}</p></section>}
        </article>
        <aside className="calendar-event-details__aside">
          <span className="eyebrow">Auditoria</span>
          <dl><div><dt>Criado</dt><dd>{formatAuditInstant(data.created_at)}</dd></div><div><dt>Atualizado</dt><dd>{formatAuditInstant(data.updated_at)}</dd></div>{data.completed_at && <div><dt>Concluído</dt><dd>{formatAuditInstant(data.completed_at)}</dd></div>}{data.cancelled_at && <div><dt>Cancelado</dt><dd>{formatAuditInstant(data.cancelled_at)}</dd></div>}</dl>
          {!canManage && <p className="calendar-event-details__readonly">Seu perfil possui acesso somente para leitura aos eventos operacionais.</p>}
          {canManage && data.status === 'scheduled' && <>
            <Link className="secondary-button primary-button--link" to={`/app/agenda/eventos/${data.id}/editar`}>Editar evento</Link>
            <button type="button" onClick={() => setAction('complete')}>Concluir</button>
            <button type="button" className="danger-text-button" onClick={() => setAction('cancel')}>Cancelar</button>
          </>}
          {canManage && <button type="button" className="danger-text-button" onClick={() => setAction('archive')}>Excluir evento</button>}
        </aside>
      </div>

      {action && <div className="modal-backdrop" role="presentation"><div className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="event-action-title">
        <span className="eyebrow">Confirmação rastreável</span>
        <h2 id="event-action-title">{action === 'complete' ? 'Concluir evento?' : action === 'cancel' ? 'Cancelar evento?' : 'Excluir evento da agenda?'}</h2>
        <p>{action === 'archive' ? 'O evento sairá da agenda padrão, mas continuará preservado no banco.' : 'Esta ação altera o histórico operacional do compromisso.'}</p>
        {action === 'cancel' && <label className="field"><span>Motivo do cancelamento</span><textarea autoFocus rows={3} maxLength={500} value={reason} onChange={(e) => { setReason(e.target.value); setActionError(null) }} /></label>}
        {actionError && <div className="alert alert--error" role="alert">{actionError}</div>}
        <div className="confirmation-dialog__actions">
          <button type="button" className="secondary-button" disabled={busy} onClick={() => { setAction(null); setActionError(null) }}>Voltar</button>
          {action === 'complete' && <button type="button" className="primary-button primary-button--compact" disabled={busy} onClick={() => void run(() => completeCalendarEvent(organization.data!, data.id), 'Evento concluído com sucesso.')}>{busy ? 'Concluindo…' : 'Confirmar conclusão'}</button>}
          {action === 'cancel' && <button type="button" className="danger-button" disabled={busy} onClick={handleCancel}>{busy ? 'Cancelando…' : 'Confirmar cancelamento'}</button>}
          {action === 'archive' && <button type="button" className="danger-button" disabled={busy} onClick={() => void run(() => archiveCalendarEvent(organization.data!, data.id), 'Evento excluído da agenda ativa com sucesso.', true)}>{busy ? 'Excluindo…' : 'Excluir da agenda'}</button>}
        </div>
      </div></div>}
    </section>
  )
}
