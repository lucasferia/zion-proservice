import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { businessDateValue } from '../../lib/dateTime'
import { calendarDays, monthRange, shiftMonth } from './calendar'
import { describeReturnTiming, formatReturnDate } from './formatters'
import { ReturnScheduleActions } from './ReturnScheduleActions'
import { useReturnSchedules } from './returnQueries'
import { ReturnStatusBadge } from './ReturnStatusBadge'
import { RETURN_STATUSES, type ReturnSchedule, type ReturnScheduleFilters } from './types'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function monthTitle(month: string) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${month}-01T00:00:00Z`))
}

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
}

function DayAgenda({ schedules, organizationId, onSuccess }: {
  schedules: ReturnSchedule[]
  organizationId: string
  onSuccess: (message: string) => void
}) {
  if (!schedules.length) return <div className="calendar-day-empty"><strong>Agenda livre</strong><p>Nenhum retorno neste dia.</p></div>
  return (
    <div className="calendar-day-agenda">
      {schedules.map((schedule) => (
        <article key={schedule.id} className={`calendar-agenda-card calendar-agenda-card--${schedule.timing}`}>
          <div>
            <ReturnStatusBadge status={schedule.status} timing={schedule.timing} />
            <strong>{schedule.client_name}</strong>
            <span>{schedule.equipment_name} · {schedule.location_name || 'Sem unidade específica'}</span>
            <small>{describeReturnTiming(schedule.days_until, schedule.is_overdue)}</small>
            {schedule.notes && <p>{schedule.notes}</p>}
          </div>
          <div className="calendar-agenda-card__links">
            <Link to={`/app/clientes/${schedule.client_id}`}>Ver cliente</Link>
            {schedule.origin_maintenance_id && <Link to={`/app/manutencoes/${schedule.origin_maintenance_id}`}>Abrir OS</Link>}
          </div>
          <ReturnScheduleActions organizationId={organizationId} schedule={schedule} onSuccess={onSuccess} />
        </article>
      ))}
    </div>
  )
}

export function ReturnScheduleListPage() {
  const today = businessDateValue()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [selectedDate, setSelectedDate] = useState(today)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<ReturnScheduleFilters>(() => ({
    ...monthRange(today.slice(0, 7)), clientId: searchParams.get('clientId') ?? '', city: '', status: '',
  }))
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const { organization, schedules, summary, options, deferredSearch } = useReturnSchedules(search, filters)
  const routedSuccess = (location.state as { success?: string } | null)?.success
  const loading = organization.isLoading || (organization.isSuccess && (schedules.isLoading || summary.isLoading || options.isLoading))
  const error = organization.error ?? schedules.error ?? summary.error ?? options.error
  const days = useMemo(() => calendarDays(month), [month])
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, ReturnSchedule[]>()
    for (const schedule of schedules.data ?? []) grouped.set(schedule.scheduled_date, [...(grouped.get(schedule.scheduled_date) ?? []), schedule])
    return grouped
  }, [schedules.data])
  const selectedSchedules = eventsByDate.get(selectedDate) ?? []
  const hasFilters = Boolean(search || filters.clientId || filters.city || filters.status)

  function selectMonth(nextMonth: string, preferredDate = `${nextMonth}-01`) {
    setMonth(nextMonth)
    setSelectedDate(preferredDate)
    setFilters((current) => ({ ...current, ...monthRange(nextMonth) }))
  }

  function resetToday() {
    selectMonth(today.slice(0, 7), today)
  }

  return (
    <section className="return-page calendar-page" aria-labelledby="return-title">
      <div className="module-heading return-heading">
        <div><span className="eyebrow">Ritmo preventivo</span><h1 id="return-title">Agenda de retornos</h1><p>Visualize o mês como calendário e abra o dia para concluir ou cancelar cada compromisso.</p></div>
        <Link className="primary-button primary-button--compact primary-button--link" to="/app/agenda/novo">Agendar retorno <span aria-hidden="true">+</span></Link>
      </div>

      {(routedSuccess || actionSuccess) && <div className="alert alert--success" role="status">{actionSuccess || routedSuccess}</div>}

      <div className="return-horizon" aria-label="Resumo operacional da agenda">
        <div className="return-horizon__overdue"><span>Vencidos</span><strong>{summary.data?.overdue_count ?? 0}</strong><small>exigem prioridade</small></div>
        <div><span>Hoje</span><strong>{summary.data?.today_count ?? 0}</strong><small>janela imediata</small></div>
        <div><span>Próximos 7 dias</span><strong>{summary.data?.week_count ?? 0}</strong><small>planejamento semanal</small></div>
        <div><span>Próximos 30 dias</span><strong>{summary.data?.next_30_count ?? 0}</strong><small>horizonte preventivo</small></div>
      </div>

      <div className="return-toolbar calendar-filterbar">
        <label className="search-field return-search" htmlFor="return-search"><SearchIcon /><span className="sr-only">Buscar retornos</span><input id="return-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cliente, equipamento, OS ou unidade" autoComplete="off" />{search !== deferredSearch && <span className="search-field__busy" aria-label="Buscando" />}</label>
        <label className="return-filter"><span>Cliente</span><select value={filters.clientId} onChange={(event) => setFilters((current) => ({ ...current, clientId: event.target.value }))}><option value="">Todos</option>{options.data?.clients.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}</select></label>
        <label className="return-filter"><span>Cidade</span><select value={filters.city} onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value }))}><option value="">Todas</option>{options.data?.cities.map((city) => <option value={city} key={city}>{city}</option>)}</select></label>
        <label className="return-filter"><span>Status</span><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as ReturnScheduleFilters['status'] }))}><option value="">Todos</option>{RETURN_STATUSES.map((status) => <option value={status.value} key={status.value}>{status.label}</option>)}</select></label>
        <button className="filter-clear" type="button" disabled={!hasFilters} onClick={() => { setSearch(''); setFilters((current) => ({ ...current, clientId: '', city: '', status: '' })) }}>Limpar filtros</button>
      </div>

      {loading && <PageSkeleton rows={5} />}
      {!loading && error && <PageState title="Agenda indisponível" description={error.message} actionLabel="Tentar novamente" onAction={() => { void schedules.refetch(); void summary.refetch(); void options.refetch() }} tone="error" />}

      {!loading && !error && (
        <div className="calendar-workspace">
          <section className="month-calendar" aria-labelledby="calendar-month-title">
            <header className="calendar-header">
              <div><span className="eyebrow">Visão mensal</span><h2 id="calendar-month-title">{monthTitle(month)}</h2></div>
              <div className="calendar-navigation">
                <button type="button" onClick={() => selectMonth(shiftMonth(month, -1))} aria-label="Mês anterior">←</button>
                <button type="button" onClick={resetToday}>Hoje</button>
                <button type="button" onClick={() => selectMonth(shiftMonth(month, 1))} aria-label="Próximo mês">→</button>
              </div>
            </header>
            <div className="calendar-weekdays" aria-hidden="true">{WEEKDAYS.map((day) => <span key={day}>{day}</span>)}</div>
            <div className="calendar-grid">
              {days.map((day) => {
                const dayEvents = eventsByDate.get(day.date) ?? []
                const isToday = day.date === today
                const isSelected = day.date === selectedDate
                return (
                  <button
                    type="button"
                    key={day.date}
                    className={`calendar-day${day.inMonth ? '' : ' calendar-day--outside'}${isToday ? ' calendar-day--today' : ''}${isSelected ? ' calendar-day--selected' : ''}`}
                    onClick={() => setSelectedDate(day.date)}
                    aria-pressed={isSelected}
                    aria-label={`${formatReturnDate(day.date)}, ${dayEvents.length} ${dayEvents.length === 1 ? 'evento' : 'eventos'}`}
                  >
                    <span className="calendar-day__number">{Number(day.date.slice(-2))}</span>
                    <span className="calendar-day__events">
                      {dayEvents.slice(0, 2).map((event) => <span key={event.id} className={`calendar-event calendar-event--${event.timing}`}>{event.client_name}</span>)}
                      {dayEvents.length > 2 && <small>+{dayEvents.length - 2}</small>}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <aside className="calendar-inspector" aria-labelledby="selected-day-title">
            <header><span className="eyebrow">Dia selecionado</span><h2 id="selected-day-title">{formatReturnDate(selectedDate)}</h2><small>{selectedSchedules.length} {selectedSchedules.length === 1 ? 'compromisso' : 'compromissos'}</small></header>
            <DayAgenda schedules={selectedSchedules} organizationId={organization.data!} onSuccess={setActionSuccess} />
            {!selectedSchedules.length && !hasFilters && <button className="secondary-button" type="button" onClick={() => navigate('/app/agenda/novo')}>Agendar neste período</button>}
          </aside>
        </div>
      )}
    </section>
  )
}
