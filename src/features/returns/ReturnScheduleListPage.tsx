import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { businessDateValue } from '../../lib/dateTime'
import { useCalendarEventOptions, useCalendarEvents } from '../calendar-events/calendarEventQueries'
import { CalendarEventStatusBadge } from '../calendar-events/CalendarEventStatusBadge'
import { CALENDAR_EVENT_TYPES, calendarEventTypeLabel, type CalendarEventFilters } from '../calendar-events/types'
import { agendaItemPath, AgendaItem, AgendaStatusFilter, AgendaTypeFilter, mergeAgendaItems, returnStatusForAgenda } from './agenda'
import { calendarDays, monthRange, shiftMonth } from './calendar'
import { describeReturnTiming, formatReturnDate } from './formatters'
import { ReturnScheduleActions } from './ReturnScheduleActions'
import { useReturnSchedules } from './returnQueries'
import { ReturnStatusBadge } from './ReturnStatusBadge'
import type { ReturnScheduleFilters } from './types'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

type AgendaFilters = {
  clientId: string
  city: string
  status: AgendaStatusFilter
  type: AgendaTypeFilter
}

function monthTitle(month: string) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${month}-01T00:00:00Z`))
}

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
}

export function DayAgenda({ items, organizationId, canManageEvents, onSuccess }: {
  items: AgendaItem[]
  organizationId: string
  canManageEvents: boolean
  onSuccess: (message: string) => void
}) {
  if (!items.length) return <div className="calendar-day-empty"><strong>Agenda livre</strong><p>Nenhum compromisso neste dia.</p></div>
  return (
    <div className="calendar-day-agenda">
      {items.map((item) => item.source === 'return' && item.returnSchedule ? (
        <article key={item.key} className={`calendar-agenda-card calendar-agenda-card--${item.timing}`}>
          <div>
            <div className="calendar-agenda-card__meta"><span className="agenda-source agenda-source--return">Retorno</span><strong>{item.timeLabel}</strong></div>
            <ReturnStatusBadge status={item.returnSchedule.status} timing={item.returnSchedule.timing} />
            <Link className="calendar-agenda-card__title" to={agendaItemPath(item)}>{item.returnSchedule.client_name}</Link>
            <span>{item.subtitle}</span>
            <small>{describeReturnTiming(item.returnSchedule.days_until, item.returnSchedule.is_overdue)}</small>
            {item.returnSchedule.notes && <p>{item.returnSchedule.notes}</p>}
          </div>
          <div className="calendar-agenda-card__links">
            <Link to={`/app/clientes/${item.returnSchedule.client_id}`}>Ver cliente</Link>
            {item.returnSchedule.origin_maintenance_id && <Link to={`/app/manutencoes/${item.returnSchedule.origin_maintenance_id}`}>Abrir OS</Link>}
          </div>
          <ReturnScheduleActions organizationId={organizationId} schedule={item.returnSchedule} onSuccess={onSuccess} />
        </article>
      ) : item.calendarEvent && (
        <article key={item.key} className={`calendar-agenda-card calendar-agenda-card--event calendar-agenda-card--${item.calendarEvent.status}`}>
          <div>
            <div className="calendar-agenda-card__meta"><span className="agenda-source agenda-source--event">{calendarEventTypeLabel(item.calendarEvent.event_type)}</span><strong>{item.timeLabel}</strong></div>
            <CalendarEventStatusBadge status={item.calendarEvent.status} />
            <Link className="calendar-agenda-card__title" to={agendaItemPath(item)}>{item.title}</Link>
            <span>{item.subtitle}</span>
            {item.calendarEvent.description && <p>{item.calendarEvent.description}</p>}
          </div>
          <div className="calendar-agenda-card__links"><Link to={`/app/agenda/eventos/${item.calendarEvent.id}`}>Abrir detalhes</Link>{canManageEvents && item.calendarEvent.status === 'scheduled' && <Link to={`/app/agenda/eventos/${item.calendarEvent.id}/editar`}>Editar</Link>}</div>
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
  const [filters, setFilters] = useState<AgendaFilters>({ clientId: searchParams.get('clientId') ?? '', city: '', status: '', type: '' })
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const range = monthRange(month)
  const returnFilters: ReturnScheduleFilters = {
    ...range, clientId: filters.clientId, city: filters.city,
    status: returnStatusForAgenda(filters.status) as ReturnScheduleFilters['status'],
  }
  const eventFilters: CalendarEventFilters = {
    ...range, clientId: filters.clientId, city: filters.city, status: filters.status,
    eventType: filters.type && filters.type !== 'return' ? filters.type : '',
  }
  const returns = useReturnSchedules(search, returnFilters)
  const calendarEvents = useCalendarEvents(search, eventFilters)
  const eventOptions = useCalendarEventOptions()
  const organizationId = returns.organization.data
  const routedSuccess = (location.state as { success?: string } | null)?.success
  const loading = returns.organization.isLoading || returns.schedules.isLoading || returns.summary.isLoading || returns.options.isLoading || calendarEvents.events.isLoading || eventOptions.options.isLoading
  const error = returns.organization.error ?? returns.schedules.error ?? returns.summary.error ?? returns.options.error ?? calendarEvents.events.error ?? eventOptions.options.error
  const canManageEvents = eventOptions.options.data?.canManage ?? false
  const items = useMemo(() => mergeAgendaItems(
    filters.type && filters.type !== 'return' ? [] : (returns.schedules.data ?? []),
    filters.type === 'return' ? [] : (calendarEvents.events.data ?? []),
  ), [calendarEvents.events.data, filters.type, returns.schedules.data])
  const days = useMemo(() => calendarDays(month), [month])
  const itemsByDate = useMemo(() => {
    const grouped = new Map<string, AgendaItem[]>()
    for (const item of items) grouped.set(item.date, [...(grouped.get(item.date) ?? []), item])
    return grouped
  }, [items])
  const selectedItems = itemsByDate.get(selectedDate) ?? []
  const hasFilters = Boolean(search || filters.clientId || filters.city || filters.status || filters.type)

  function selectMonth(nextMonth: string, preferredDate = `${nextMonth}-01`) {
    setMonth(nextMonth); setSelectedDate(preferredDate)
  }

  return (
    <section className="return-page calendar-page" aria-labelledby="agenda-title">
      <div className="module-heading return-heading">
        <div><span className="eyebrow">Operação em movimento</span><h1 id="agenda-title">Agenda operacional</h1><p>Retornos e compromissos independentes reunidos no mesmo calendário, sem misturar seus históricos.</p></div>
        <div className="agenda-heading-actions">{canManageEvents && <Link className="primary-button primary-button--compact primary-button--link" to="/app/agenda/eventos/novo">Novo evento <span aria-hidden="true">+</span></Link>}<Link className="secondary-button primary-button--link" to="/app/agenda/novo">Agendar retorno</Link></div>
      </div>

      {(routedSuccess || actionSuccess) && <div className="alert alert--success" role="status">{actionSuccess || routedSuccess}</div>}
      {!loading && !canManageEvents && <div className="agenda-readonly-note"><strong>Eventos em modo leitura</strong><span>Técnicos consultam eventos operacionais; criação e alterações são reservadas ao owner. Os retornos mantêm as permissões atuais.</span></div>}

      <div className="return-horizon" aria-label="Resumo operacional dos retornos">
        <div className="return-horizon__overdue"><span>Retornos vencidos</span><strong>{returns.summary.data?.overdue_count ?? 0}</strong><small>exigem prioridade</small></div>
        <div><span>Retornos hoje</span><strong>{returns.summary.data?.today_count ?? 0}</strong><small>janela imediata</small></div>
        <div><span>Próximos 7 dias</span><strong>{returns.summary.data?.week_count ?? 0}</strong><small>retornos preventivos</small></div>
        <div><span>Compromissos no mês</span><strong>{items.length}</strong><small>eventos e retornos filtrados</small></div>
      </div>

      <div className="return-toolbar calendar-filterbar calendar-filterbar--unified">
        <label className="search-field return-search" htmlFor="agenda-search"><SearchIcon /><span className="sr-only">Buscar agenda</span><input id="agenda-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Título, cliente, equipamento, OS ou unidade" autoComplete="off" />{search !== returns.deferredSearch && <span className="search-field__busy" aria-label="Buscando" />}</label>
        <label className="return-filter"><span>Tipo</span><select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value as AgendaTypeFilter }))}><option value="">Todos</option><option value="return">Retorno</option>{CALENDAR_EVENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="return-filter"><span>Status</span><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as AgendaStatusFilter }))}><option value="">Todos</option><option value="scheduled">Agendado/Pendente</option><option value="completed">Concluído</option><option value="cancelled">Cancelado</option></select></label>
        <label className="return-filter"><span>Cliente</span><select value={filters.clientId} onChange={(event) => setFilters((current) => ({ ...current, clientId: event.target.value }))}><option value="">Todos</option>{returns.options.data?.clients.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}</select></label>
        <label className="return-filter"><span>Cidade</span><select value={filters.city} onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value }))}><option value="">Todas</option>{returns.options.data?.cities.map((city) => <option value={city} key={city}>{city}</option>)}</select></label>
        <button className="filter-clear" type="button" disabled={!hasFilters} onClick={() => { setSearch(''); setFilters({ clientId: '', city: '', status: '', type: '' }) }}>Limpar filtros</button>
      </div>

      {loading && <PageSkeleton rows={5} />}
      {!loading && error && <PageState title="Agenda indisponível" description={error.message} actionLabel="Tentar novamente" onAction={() => { void returns.schedules.refetch(); void returns.summary.refetch(); void returns.options.refetch(); void calendarEvents.events.refetch(); void eventOptions.options.refetch() }} tone="error" />}

      {!loading && !error && organizationId && <div className="calendar-workspace">
        <section className="month-calendar" aria-labelledby="calendar-month-title">
          <header className="calendar-header"><div><span className="eyebrow">Visão mensal · America/Sao_Paulo</span><h2 id="calendar-month-title">{monthTitle(month)}</h2></div><div className="calendar-navigation"><button type="button" onClick={() => selectMonth(shiftMonth(month, -1))} aria-label="Mês anterior">←</button><button type="button" onClick={() => selectMonth(today.slice(0, 7), today)}>Hoje</button><button type="button" onClick={() => selectMonth(shiftMonth(month, 1))} aria-label="Próximo mês">→</button></div></header>
          <div className="calendar-weekdays" aria-hidden="true">{WEEKDAYS.map((day) => <span key={day}>{day}</span>)}</div>
          <div className="calendar-grid">{days.map((day) => {
            const dayItems = itemsByDate.get(day.date) ?? []
            const isSelected = day.date === selectedDate
            return <button type="button" key={day.date} className={`calendar-day${day.inMonth ? '' : ' calendar-day--outside'}${day.date === today ? ' calendar-day--today' : ''}${isSelected ? ' calendar-day--selected' : ''}`} onClick={() => day.inMonth ? setSelectedDate(day.date) : selectMonth(day.date.slice(0, 7), day.date)} aria-pressed={isSelected} aria-label={`${formatReturnDate(day.date)}, ${dayItems.length} ${dayItems.length === 1 ? 'compromisso' : 'compromissos'}`}>
              <span className="calendar-day__number">{Number(day.date.slice(-2))}</span><span className="calendar-day__events">{dayItems.slice(0, 3).map((item) => <span key={item.key} className={`calendar-event calendar-event--${item.timing} calendar-event--source-${item.source}`}><b>{item.timeLabel}</b> {item.title}</span>)}{dayItems.length > 3 && <small>+{dayItems.length - 3}</small>}</span>
            </button>
          })}</div>
        </section>
        <aside className="calendar-inspector" aria-labelledby="selected-day-title"><header><span className="eyebrow">Dia selecionado</span><h2 id="selected-day-title">{formatReturnDate(selectedDate)}</h2><small>{selectedItems.length} {selectedItems.length === 1 ? 'compromisso' : 'compromissos'}</small></header><DayAgenda items={selectedItems} organizationId={organizationId} canManageEvents={canManageEvents} onSuccess={setActionSuccess} />{!selectedItems.length && !hasFilters && <button className="secondary-button" type="button" onClick={() => navigate(canManageEvents ? '/app/agenda/eventos/novo' : '/app/agenda/novo')}>Agendar neste dia</button>}</aside>
      </div>}
    </section>
  )
}
