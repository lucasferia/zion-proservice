import { Link } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { describeReturnTiming, formatReturnDate } from './formatters'
import { useRelevantReturns } from './returnQueries'
import { ReturnStatusBadge } from './ReturnStatusBadge'

export function RelevantReturns({ clientId, equipmentId }: { clientId?: string; equipmentId?: string }) {
  const { schedules } = useRelevantReturns(clientId, equipmentId)
  const relevant = schedules.data?.filter((item) => item.status === 'pending').slice(0, 5) ?? []

  return (
    <section className="relevant-returns" aria-labelledby={`relevant-returns-${clientId ?? equipmentId}`}>
      <div className="section-heading"><div><span className="eyebrow">Próximos compromissos</span><h2 id={`relevant-returns-${clientId ?? equipmentId}`}>Retornos</h2></div><Link className="secondary-button secondary-button--link" to={`/app/agenda?${clientId ? `clientId=${clientId}` : ''}`}>Ver agenda</Link></div>
      {schedules.isLoading && <PageSkeleton rows={2} />}
      {schedules.isError && <PageState title="Retornos indisponíveis" description={schedules.error.message} actionLabel="Tentar novamente" onAction={() => void schedules.refetch()} tone="error" />}
      {schedules.isSuccess && relevant.length === 0 && <PageState title="Nenhum retorno pendente" description="Os próximos acompanhamentos deste cadastro aparecerão aqui." />}
      {relevant.length > 0 && <div className="relevant-return-list">{relevant.map((schedule) => <Link to="/app/agenda" key={schedule.id} className={`relevant-return relevant-return--${schedule.timing}`}><div><strong>{formatReturnDate(schedule.scheduled_date)}</strong><span>{describeReturnTiming(schedule.days_until, schedule.is_overdue)}</span></div><div><strong>{schedule.equipment_name}</strong><span>{schedule.location_name || schedule.client_name}</span></div><ReturnStatusBadge status={schedule.status} timing={schedule.timing} /></Link>)}</div>}
    </section>
  )
}
