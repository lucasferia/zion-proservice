import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { calendarEventToInput, createCalendarEvent, updateCalendarEvent } from './calendarEventApi'
import { calendarEventKeys, useCalendarEventDetails, useCalendarEventOptions } from './calendarEventQueries'
import { CalendarEventForm } from './CalendarEventForm'

export function CreateCalendarEventPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { organization, options } = useCalendarEventOptions()
  const error = organization.error ?? options.error
  if (organization.isLoading || options.isLoading) return <PageSkeleton rows={6} />
  if (error || !organization.data || !options.data) return <PageState title="Agenda indisponível" description={error?.message ?? 'Não foi possível carregar os dados do evento.'} tone="error" />
  if (!options.data.canManage) return <PageState title="Acesso somente para leitura" description="Somente o owner pode criar eventos operacionais. Técnicos podem consultar a agenda unificada." />
  return (
    <section className="return-form-page" aria-labelledby="new-calendar-event-title">
      <Link className="back-link" to="/app/agenda">← Voltar para agenda</Link>
      <div className="module-heading"><div><span className="eyebrow">Agenda operacional</span><h1 id="new-calendar-event-title">Novo evento</h1><p>Crie um compromisso independente de retorno, cliente ou ordem de serviço.</p></div></div>
      <CalendarEventForm options={options.data} submitLabel="Criar evento" onCancel={() => navigate('/app/agenda')} onSubmit={async (input) => {
        const id = await createCalendarEvent(organization.data!, input)
        await queryClient.invalidateQueries({ queryKey: calendarEventKeys.all })
        navigate(`/app/agenda/eventos/${id}`, { replace: true, state: { success: 'Evento criado com sucesso.' } })
      }} />
    </section>
  )
}

export function EditCalendarEventPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { organization, event, options } = useCalendarEventDetails(eventId)
  const error = organization.error ?? event.error ?? options.error
  if (organization.isLoading || event.isLoading || options.isLoading) return <PageSkeleton rows={6} />
  if (error || !organization.data || !event.data || !options.data) return <PageState title="Evento indisponível" description={error?.message ?? 'Evento não encontrado.'} tone="error" />
  if (!options.data.canManage || event.data.status !== 'scheduled') return <PageState title="Evento somente para leitura" description="A edição é permitida apenas ao owner enquanto o evento está agendado." />
  return (
    <section className="return-form-page" aria-labelledby="edit-calendar-event-title">
      <Link className="back-link" to={`/app/agenda/eventos/${event.data.id}`}>← Voltar para o evento</Link>
      <div className="module-heading"><div><span className="eyebrow">Agenda operacional</span><h1 id="edit-calendar-event-title">Editar evento</h1><p>Atualize o compromisso enquanto ele ainda está agendado.</p></div></div>
      <CalendarEventForm options={options.data} initialValue={calendarEventToInput(event.data)} submitLabel="Salvar alterações" onCancel={() => navigate(`/app/agenda/eventos/${event.data.id}`)} onSubmit={async (input) => {
        await updateCalendarEvent(organization.data!, event.data.id, input)
        await queryClient.invalidateQueries({ queryKey: calendarEventKeys.all })
        navigate(`/app/agenda/eventos/${event.data.id}`, { replace: true, state: { success: 'Evento atualizado com sucesso.' } })
      }} />
    </section>
  )
}
