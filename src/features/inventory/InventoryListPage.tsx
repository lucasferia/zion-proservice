import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { formatInventoryCurrency, formatInventoryQuantity } from './formatters'
import { InventorySituationBadge } from './InventorySituationBadge'
import { useInventoryItems } from './inventoryQueries'
import { INVENTORY_SITUATIONS, type InventoryFilters, type InventorySituation } from './types'

const emptyFilters: InventoryFilters = { category: '', situation: '' }

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

export function InventoryListPage() {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<InventoryFilters>(emptyFilters)
  const { organization, items, options, deferredSearch } = useInventoryItems(search, filters)
  const location = useLocation()
  const success = (location.state as { success?: string } | null)?.success
  const isLoading = organization.isLoading
    || (organization.isSuccess && (items.isLoading || options.isLoading))
  const error = organization.error ?? items.error ?? options.error
  const hasFilters = Boolean(search || filters.category || filters.situation)
  const counts = useMemo(() => {
    const initial: Record<InventorySituation, number> = {
      normal: 0,
      attention: 0,
      critical: 0,
      out_of_stock: 0,
    }
    for (const item of items.data ?? []) initial[item.stock_situation] += 1
    return initial
  }, [items.data])

  return (
    <section className="inventory-page" aria-labelledby="inventory-title">
      <div className="module-heading">
        <div>
          <span className="eyebrow">Controle de peças e insumos</span>
          <h1 id="inventory-title">Estoque</h1>
          <p>Acompanhe saldos, níveis mínimos e um histórico confiável de cada movimentação.</p>
        </div>
        <div className="module-heading__actions">
          <Link className="secondary-button secondary-button--link" to="/app/fornecedores">Fornecedores</Link>
          <Link className="primary-button primary-button--link" to="/app/estoque/novo">Novo item <span aria-hidden="true">+</span></Link>
        </div>
      </div>

      {success && <div className="alert alert--success" role="status">{success}</div>}

      <div className="inventory-indicators" aria-label="Indicadores dos itens exibidos">
        {INVENTORY_SITUATIONS.map((situation) => (
          <button
            className={`inventory-indicator inventory-indicator--${situation.value}${filters.situation === situation.value ? ' inventory-indicator--selected' : ''}`}
            type="button"
            key={situation.value}
            onClick={() => setFilters((current) => ({
              ...current,
              situation: current.situation === situation.value ? '' : situation.value,
            }))}
            aria-pressed={filters.situation === situation.value}
          >
            <span>{situation.label}</span>
            <strong>{counts[situation.value]}</strong>
          </button>
        ))}
      </div>

      <div className="inventory-toolbar">
        <label className="search-field" htmlFor="inventory-search">
          <SearchIcon />
          <span className="sr-only">Buscar itens de estoque</span>
          <input
            id="inventory-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, SKU ou categoria"
            autoComplete="off"
          />
          {search !== deferredSearch && <span className="search-field__busy" aria-label="Buscando" />}
        </label>
        <label className="inventory-filter">
          <span>Categoria</span>
          <select
            value={filters.category}
            onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
          >
            <option value="">Todas as categorias</option>
            {options.data?.categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="inventory-filter">
          <span>Situação</span>
          <select
            value={filters.situation}
            onChange={(event) => setFilters((current) => ({
              ...current,
              situation: event.target.value as InventoryFilters['situation'],
            }))}
          >
            <option value="">Todas as situações</option>
            {INVENTORY_SITUATIONS.map((situation) => (
              <option key={situation.value} value={situation.value}>{situation.label}</option>
            ))}
          </select>
        </label>
        <button
          className="filter-clear"
          type="button"
          disabled={!hasFilters}
          onClick={() => { setSearch(''); setFilters(emptyFilters) }}
        >
          Limpar filtros
        </button>
        <span className="directory-count" aria-live="polite">
          {items.data ? `${items.data.length} ${items.data.length === 1 ? 'item' : 'itens'}` : '—'}
        </span>
      </div>

      {isLoading && <PageSkeleton rows={5} />}
      {!isLoading && error && (
        <PageState
          title="Não foi possível carregar o estoque"
          description={error instanceof Error ? error.message : 'Tente novamente em alguns instantes.'}
          actionLabel="Tentar novamente"
          onAction={() => {
            if (organization.isError) void organization.refetch()
            if (items.isError) void items.refetch()
            if (options.isError) void options.refetch()
          }}
          tone="error"
        />
      )}
      {!isLoading && !error && items.data?.length === 0 && (
        <PageState
          title={hasFilters ? 'Nenhum item encontrado' : 'Seu estoque começa aqui'}
          description={
            hasFilters
              ? 'Revise a busca ou remova filtros para ampliar os resultados.'
              : 'Cadastre o primeiro item e registre uma entrada para começar o controle.'
          }
        />
      )}

      {!isLoading && !error && Boolean(items.data?.length) && (
        <div className="inventory-directory" aria-label="Itens de estoque">
          <div className="inventory-directory__header" aria-hidden="true">
            <span>Item</span><span>Saldo</span><span>Mínimo</span><span>Custo médio</span><span>Situação</span><span />
          </div>
          {items.data?.map((item, index) => (
            <Link
              className="inventory-row"
              to={`/app/estoque/${item.id}`}
              key={item.id}
              style={{ '--row-index': index } as React.CSSProperties}
            >
              <div className="inventory-row__identity">
                <span className="inventory-glyph" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.sku || 'Sem SKU'} · {item.category || 'Sem categoria'}</span>
                  {item.status === 'inactive' && <small>Item inativo</small>}
                </div>
              </div>
              <div className="inventory-row__metric inventory-row__metric--primary">
                <strong>{formatInventoryQuantity(item.current_quantity)}</strong>
                <span>{item.unit_of_measure}</span>
              </div>
              <div className="inventory-row__metric">
                <strong>{formatInventoryQuantity(item.minimum_stock)}</strong>
                <span>{item.unit_of_measure}</span>
              </div>
              <div className="inventory-row__metric inventory-row__cost">
                <strong>{formatInventoryCurrency(item.average_unit_cost)}</strong>
                <span>por {item.unit_of_measure}</span>
              </div>
              <InventorySituationBadge situation={item.stock_situation} />
              <span className="client-row__arrow"><ArrowIcon /></span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
