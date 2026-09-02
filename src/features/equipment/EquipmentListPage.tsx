import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { EquipmentStatusBadge } from './EquipmentStatusBadge'
import { useEquipment } from './equipmentQueries'
import { EQUIPMENT_STATUSES, type EquipmentFilters } from './types'

const emptyFilters: EquipmentFilters = {
  category: '',
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

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  )
}

export function EquipmentListPage() {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<EquipmentFilters>(emptyFilters)
  const { organization, equipment, options, deferredSearch } = useEquipment(search, filters)
  const location = useLocation()
  const success = (location.state as { success?: string } | null)?.success

  const hasFilters = Boolean(search || filters.category || filters.status)
  const isLoading = organization.isLoading
    || (organization.isSuccess && (equipment.isLoading || options.isLoading))
  const error = organization.error ?? equipment.error ?? options.error

  function setFilter<Key extends keyof EquipmentFilters>(key: Key, value: EquipmentFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  return (
    <section className="equipment-page" aria-labelledby="equipment-title">
      <div className="module-heading">
        <div>
          <span className="eyebrow">Catálogo técnico</span>
          <h1 id="equipment-title">Equipamentos</h1>
          <p>Mantenha um catálogo geral de máquinas para reutilizar nos relatórios de visita.</p>
        </div>
        <Link className="primary-button primary-button--link" to="/app/equipamentos/novo">
          Novo equipamento <span aria-hidden="true">+</span>
        </Link>
      </div>

      {success && <div className="alert alert--success" role="status">{success}</div>}

      <div className="equipment-toolbar">
        <div className="directory-toolbar directory-toolbar--equipment">
          <label className="search-field" htmlFor="equipment-search">
            <SearchIcon />
            <span className="sr-only">Buscar equipamentos</span>
            <input
              id="equipment-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome, marca, modelo, série ou patrimônio"
              autoComplete="off"
            />
            {search !== deferredSearch && <span className="search-field__busy" aria-label="Buscando" />}
          </label>
          <span className="directory-count" aria-live="polite">
            {equipment.data
              ? `${equipment.data.length} ${equipment.data.length === 1 ? 'equipamento' : 'equipamentos'}`
              : '—'}
          </span>
        </div>

        <div className="equipment-filters" aria-label="Filtros de equipamentos">
          <label>
            <span>Categoria</span>
            <select value={filters.category} onChange={(event) => setFilter('category', event.target.value)}>
              <option value="">Todas as categorias</option>
              {options.data?.categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Status</span>
            <select
              value={filters.status}
              onChange={(event) => setFilter('status', event.target.value as EquipmentFilters['status'])}
            >
              <option value="">Todos os status</option>
              {EQUIPMENT_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </label>
          <button
            className="filter-clear"
            type="button"
            onClick={() => {
              setSearch('')
              setFilters(emptyFilters)
            }}
            disabled={!hasFilters}
          >
            Limpar filtros
          </button>
        </div>
      </div>

      {isLoading && <PageSkeleton rows={5} />}

      {!isLoading && error && (
        <PageState
          title="Não foi possível carregar os equipamentos"
          description={error instanceof Error ? error.message : 'Tente novamente em alguns instantes.'}
          actionLabel="Tentar novamente"
          onAction={() => {
            if (organization.isError) void organization.refetch()
            if (equipment.isError) void equipment.refetch()
            if (options.isError) void options.refetch()
          }}
          tone="error"
        />
      )}

      {!isLoading && !error && equipment.data?.length === 0 && (
        <PageState
          title={hasFilters ? 'Nenhum equipamento encontrado' : 'Seu parque começa aqui'}
          description={
            hasFilters
              ? 'Revise a busca ou remova alguns filtros para ampliar os resultados.'
              : 'Cadastre o primeiro equipamento do catálogo técnico da organização.'
          }
        />
      )}

      {!isLoading && !error && Boolean(equipment.data?.length) && (
        <div className="equipment-directory" aria-label="Lista de equipamentos">
          <div className="equipment-directory__header equipment-directory__header--general" aria-hidden="true">
            <span>Equipamento</span>
            <span>Identificação</span>
            <span>Status</span>
            <span />
          </div>
          {equipment.data?.map((item, index) => (
            <Link
              className="equipment-row equipment-row--general"
              to={`/app/equipamentos/${item.id}`}
              key={item.id}
              style={{ '--row-index': index } as React.CSSProperties}
            >
              <div className="equipment-row__identity">
                <span className="equipment-glyph" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.category} · {[item.brand, item.model].filter(Boolean).join(' ') || 'Sem marca/modelo'}</span>
                </div>
              </div>
              <div className="equipment-row__codes">
                <strong>{item.asset_tag || 'Sem patrimônio'}</strong>
                <span>{item.serial_number || 'Sem número de série'}</span>
              </div>
              <EquipmentStatusBadge status={item.status} />
              <span className="client-row__arrow"><ArrowIcon /></span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
