import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { formatMaintenanceCurrency, formatMaintenanceDate } from './formatters'
import { useMaintenances } from './maintenanceQueries'
import { MaintenanceStatusBadge } from './MaintenanceStatusBadge'
import {
  MAINTENANCE_STATUSES,
  MAINTENANCE_TYPES,
  getMaintenanceTypeLabel,
  type MaintenanceFilters,
  type MaintenanceStatus,
} from './types'

const emptyFilters: MaintenanceFilters = {
  periodStart: '',
  periodEnd: '',
  type: '',
  status: '',
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  )
}

export function MaintenanceListPage() {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<MaintenanceFilters>(emptyFilters)
  const { organization, maintenances, deferredSearch } = useMaintenances(search, filters)
  const location = useLocation()
  const success = (location.state as { success?: string } | null)?.success
  const isLoading = organization.isLoading || (organization.isSuccess && maintenances.isLoading)
  const error = organization.error ?? maintenances.error
  const hasFilters = Boolean(search || Object.values(filters).some(Boolean))
  const counts = useMemo(() => {
    const initial: Record<MaintenanceStatus, number> = {
      draft: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    }
    for (const maintenance of maintenances.data ?? []) initial[maintenance.status] += 1
    return initial
  }, [maintenances.data])

  return (
    <section className="maintenance-page" aria-labelledby="maintenance-title">
      <div className="module-heading">
        <div>
          <span className="eyebrow">Operação técnica em campo</span>
          <h1 id="maintenance-title">Manutenções</h1>
          <p>Registre o atendimento, organize as peças e conclua a OS com baixa segura do estoque.</p>
        </div>
        <Link className="primary-button primary-button--link" to="/app/manutencoes/nova">
          Nova OS <span aria-hidden="true">+</span>
        </Link>
      </div>

      {success && <div className="alert alert--success" role="status">{success}</div>}

      <div className="maintenance-status-strip" aria-label="Situação das ordens exibidas">
        {MAINTENANCE_STATUSES.map((status) => (
          <button
            className={`maintenance-status-card maintenance-status-card--${status.value}${filters.status === status.value ? ' maintenance-status-card--selected' : ''}`}
            key={status.value}
            type="button"
            onClick={() => setFilters((current) => ({
              ...current,
              status: current.status === status.value ? '' : status.value,
            }))}
            aria-pressed={filters.status === status.value}
          >
            <span>{status.label}</span>
            <strong>{counts[status.value]}</strong>
          </button>
        ))}
      </div>

      <div className="maintenance-toolbar">
        <label className="search-field maintenance-search" htmlFor="maintenance-search">
          <SearchIcon />
          <span className="sr-only">Buscar ordens de serviço</span>
          <input
            id="maintenance-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por OS, cliente ou equipamento"
            autoComplete="off"
          />
          {search !== deferredSearch && <span className="search-field__busy" aria-label="Buscando" />}
        </label>
        <label className="maintenance-filter">
          <span>De</span>
          <input type="date" value={filters.periodStart} onChange={(event) => setFilters((current) => ({ ...current, periodStart: event.target.value }))} />
        </label>
        <label className="maintenance-filter">
          <span>Até</span>
          <input type="date" value={filters.periodEnd} min={filters.periodStart || undefined} onChange={(event) => setFilters((current) => ({ ...current, periodEnd: event.target.value }))} />
        </label>
        <label className="maintenance-filter">
          <span>Tipo</span>
          <select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value as MaintenanceFilters['type'] }))}>
            <option value="">Todos</option>
            {MAINTENANCE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </label>
        <label className="maintenance-filter">
          <span>Status</span>
          <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as MaintenanceFilters['status'] }))}>
            <option value="">Todos</option>
            {MAINTENANCE_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </label>
        <button className="filter-clear" type="button" disabled={!hasFilters} onClick={() => { setSearch(''); setFilters(emptyFilters) }}>
          Limpar filtros
        </button>
      </div>

      {isLoading && <PageSkeleton rows={5} />}
      {!isLoading && error && (
        <PageState title="Não foi possível carregar as manutenções" description={error.message} actionLabel="Tentar novamente" onAction={() => void (organization.isError ? organization.refetch() : maintenances.refetch())} tone="error" />
      )}
      {!isLoading && !error && maintenances.data?.length === 0 && (
        <PageState
          title={hasFilters ? 'Nenhuma OS encontrada' : 'Nenhuma manutenção registrada'}
          description={hasFilters ? 'Revise a busca, o período ou os filtros.' : 'Crie a primeira ordem de serviço para iniciar o histórico técnico.'}
        />
      )}

      {!isLoading && !error && Boolean(maintenances.data?.length) && (
        <div className="maintenance-directory" aria-label="Ordens de serviço">
          <div className="maintenance-directory__header" aria-hidden="true">
            <span>OS / atendimento</span><span>Cliente / equipamento</span><span>Técnico</span><span>Valor</span><span>Status</span>
          </div>
          {maintenances.data?.map((maintenance, index) => (
            <Link className="maintenance-row" to={`/app/manutencoes/${maintenance.id}`} key={maintenance.id} style={{ '--row-index': index } as React.CSSProperties}>
              <div className="maintenance-row__order">
                <span className="maintenance-order-mark" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <div><strong>{maintenance.work_order_number}</strong><span>{getMaintenanceTypeLabel(maintenance.maintenance_type)} · {formatMaintenanceDate(maintenance.scheduled_at)}</span></div>
              </div>
              <div><strong>{maintenance.client_name}</strong><span>{maintenance.equipment_name}{maintenance.location_name ? ` · ${maintenance.location_name}` : ''}</span></div>
              <div><strong>{maintenance.technician_name}</strong><span>{maintenance.part_count} {maintenance.part_count === 1 ? 'peça' : 'peças'}</span></div>
              <div><strong>{formatMaintenanceCurrency(maintenance.total_amount)}</strong><span>valor informado</span></div>
              <MaintenanceStatusBadge status={maintenance.status} />
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
