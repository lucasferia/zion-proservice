import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { datePlusDays, describeReturnTiming, formatReturnDate, todayValue } from './formatters'
import { ReturnScheduleActions } from './ReturnScheduleActions'
import { useReturnSchedules } from './returnQueries'
import { ReturnStatusBadge } from './ReturnStatusBadge'
import { RETURN_STATUSES, type ReturnScheduleFilters } from './types'

const emptyFilters: ReturnScheduleFilters = { periodStart: '', periodEnd: '', clientId: '', city: '', status: '' }

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
}

export function ReturnScheduleListPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<ReturnScheduleFilters>(() => ({
    ...emptyFilters,
    clientId: searchParams.get('clientId') ?? '',
  }))
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const { organization, schedules, summary, options, deferredSearch } = useReturnSchedules(search, filters)
  const location = useLocation()
  const routedSuccess = (location.state as { success?: string } | null)?.success
  const loading = organization.isLoading || (organization.isSuccess && (schedules.isLoading || summary.isLoading || options.isLoading))
  const error = organization.error ?? schedules.error ?? summary.error ?? options.error
  const hasFilters = Boolean(search || Object.values(filters).some(Boolean))

  const focusPeriod = (kind: 'overdue' | 'today' | 'week' | 'next30') => {
    const ranges = {
      overdue: { periodStart: '', periodEnd: datePlusDays(-1) },
      today: { periodStart: todayValue(), periodEnd: todayValue() },
      week: { periodStart: datePlusDays(1), periodEnd: datePlusDays(7) },
      next30: { periodStart: datePlusDays(1), periodEnd: datePlusDays(30) },
    }
    setFilters((current) => ({ ...current, ...ranges[kind], status: 'pending' }))
  }

  return (
    <section className="return-page" aria-labelledby="return-title">
      <div className="module-heading return-heading">
        <div><span className="eyebrow">Ritmo preventivo</span><h1 id="return-title">Agenda de retornos</h1><p>Priorize o que venceu, enxergue a janela da semana e mantenha cada equipamento no ciclo certo.</p></div>
        <Link className="primary-button primary-button--compact primary-button--link" to="/app/agenda/novo">Agendar retorno <span aria-hidden="true">+</span></Link>
      </div>

      {(routedSuccess || actionSuccess) && <div className="alert alert--success" role="status">{actionSuccess || routedSuccess}</div>}

      <div className="return-horizon" aria-label="Horizonte da agenda">
        <button type="button" className="return-horizon__overdue" onClick={() => focusPeriod('overdue')}><span>Vencidos</span><strong>{summary.data?.overdue_count ?? 0}</strong><small>exigem prioridade</small></button>
        <button type="button" onClick={() => focusPeriod('today')}><span>Hoje</span><strong>{summary.data?.today_count ?? 0}</strong><small>janela imediata</small></button>
        <button type="button" onClick={() => focusPeriod('week')}><span>Próximos 7 dias</span><strong>{summary.data?.week_count ?? 0}</strong><small>planejamento semanal</small></button>
        <button type="button" onClick={() => focusPeriod('next30')}><span>Próximos 30 dias</span><strong>{summary.data?.next_30_count ?? 0}</strong><small>horizonte preventivo</small></button>
      </div>

      <div className="return-toolbar">
        <label className="search-field return-search" htmlFor="return-search"><SearchIcon /><span className="sr-only">Buscar retornos</span><input id="return-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente, equipamento, OS ou unidade" autoComplete="off" />{search !== deferredSearch && <span className="search-field__busy" aria-label="Buscando" />}</label>
        <label className="return-filter"><span>De</span><input type="date" value={filters.periodStart} onChange={(event) => setFilters((current) => ({ ...current, periodStart: event.target.value }))} /></label>
        <label className="return-filter"><span>Até</span><input type="date" min={filters.periodStart || undefined} value={filters.periodEnd} onChange={(event) => setFilters((current) => ({ ...current, periodEnd: event.target.value }))} /></label>
        <label className="return-filter"><span>Cliente</span><select value={filters.clientId} onChange={(event) => setFilters((current) => ({ ...current, clientId: event.target.value }))}><option value="">Todos</option>{options.data?.clients.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}</select></label>
        <label className="return-filter"><span>Cidade</span><select value={filters.city} onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value }))}><option value="">Todas</option>{options.data?.cities.map((city) => <option value={city} key={city}>{city}</option>)}</select></label>
        <label className="return-filter"><span>Status</span><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as ReturnScheduleFilters['status'] }))}><option value="">Todos</option>{RETURN_STATUSES.map((status) => <option value={status.value} key={status.value}>{status.label}</option>)}</select></label>
        <button className="filter-clear" type="button" disabled={!hasFilters} onClick={() => { setSearch(''); setFilters(emptyFilters) }}>Limpar filtros</button>
      </div>

      {loading && <PageSkeleton rows={5} />}
      {!loading && error && <PageState title="Agenda indisponível" description={error.message} actionLabel="Tentar novamente" onAction={() => { void schedules.refetch(); void summary.refetch(); void options.refetch() }} tone="error" />}
      {!loading && !error && schedules.data?.length === 0 && <PageState title={hasFilters ? 'Nenhum retorno encontrado' : 'Agenda sem retornos'} description={hasFilters ? 'Revise o período, a busca ou os filtros aplicados.' : 'Agende manualmente ou conclua uma manutenção informando a data do próximo retorno.'} actionLabel={!hasFilters ? 'Agendar primeiro retorno' : undefined} onAction={!hasFilters ? () => navigate('/app/agenda/novo') : undefined} />}

      {!loading && !error && Boolean(schedules.data?.length) && (
        <div className="return-ledger" aria-label="Retornos agendados">
          <div className="return-ledger__header" aria-hidden="true"><span>Data</span><span>Cliente / unidade</span><span>Equipamento</span><span>Situação</span><span>Ações</span></div>
          {schedules.data?.map((schedule, index) => (
            <article className={`return-row return-row--${schedule.timing}`} key={schedule.id} style={{ '--row-index': index } as React.CSSProperties}>
              <div className="return-row__date"><span className="return-row__index">{String(index + 1).padStart(2, '0')}</span><div><strong>{formatReturnDate(schedule.scheduled_date)}</strong><span>{describeReturnTiming(schedule.days_until, schedule.is_overdue)}</span></div></div>
              <div><Link to={`/app/clientes/${schedule.client_id}`}>{schedule.client_name}</Link><span>{schedule.location_name ? `${schedule.location_name}${schedule.city ? ` · ${schedule.city}/${schedule.state}` : ''}` : 'Sem unidade específica'}</span></div>
              <div><Link to={`/app/equipamentos/${schedule.equipment_id}`}>{schedule.equipment_name}</Link><span>{schedule.origin_maintenance_id ? <Link to={`/app/manutencoes/${schedule.origin_maintenance_id}`}>Origem {schedule.origin_work_order_number}</Link> : 'Agendamento manual'}</span></div>
              <div><ReturnStatusBadge status={schedule.status} timing={schedule.timing} />{schedule.notes && <span title={schedule.notes}>{schedule.notes}</span>}{schedule.cancellation_reason && <span>{schedule.cancellation_reason}</span>}</div>
              <ReturnScheduleActions organizationId={organization.data!} schedule={schedule} onSuccess={setActionSuccess} />
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
