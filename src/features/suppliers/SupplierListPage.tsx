import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { SUPPLIER_STATUSES } from './types'
import { useSuppliers } from './supplierQueries'

export function SupplierListPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const { organization, suppliers, deferredSearch } = useSuppliers(search, status)
  const location = useLocation()
  const success = (location.state as { success?: string } | null)?.success
  const isLoading = organization.isLoading || (organization.isSuccess && suppliers.isLoading)
  const error = organization.error ?? suppliers.error

  return (
    <section className="suppliers-page" aria-labelledby="suppliers-title">
      <div className="module-heading">
        <div><span className="eyebrow">Rede de abastecimento</span><h1 id="suppliers-title">Fornecedores</h1><p>Organize contatos de peças e vincule-os opcionalmente aos itens do estoque.</p></div>
        <Link className="primary-button primary-button--link" to="/app/fornecedores/novo">Novo fornecedor <span aria-hidden="true">+</span></Link>
      </div>
      {success && <div className="alert alert--success" role="status">{success}</div>}
      <div className="supplier-toolbar">
        <label className="search-field" htmlFor="supplier-search">
          <span className="sr-only">Buscar fornecedores</span>
          <input id="supplier-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, documento ou contato" autoComplete="off" />
          {search !== deferredSearch && <span className="search-field__busy" aria-label="Buscando" />}
        </label>
        <label className="inventory-filter"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option>{SUPPLIER_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <span className="directory-count" aria-live="polite">{suppliers.data ? `${suppliers.data.length} ${suppliers.data.length === 1 ? 'fornecedor' : 'fornecedores'}` : '—'}</span>
      </div>
      {isLoading && <PageSkeleton rows={5} />}
      {!isLoading && error && <PageState title="Não foi possível carregar os fornecedores" description={error instanceof Error ? error.message : 'Tente novamente.'} actionLabel="Tentar novamente" onAction={() => void (organization.isError ? organization.refetch() : suppliers.refetch())} tone="error" />}
      {!isLoading && !error && suppliers.data?.length === 0 && <PageState title={search || status ? 'Nenhum fornecedor encontrado' : 'Cadastre sua rede de fornecedores'} description={search || status ? 'Revise a busca ou o filtro informado.' : 'O vínculo com itens de estoque é opcional e pode ser feito a qualquer momento.'} />}
      {!isLoading && !error && Boolean(suppliers.data?.length) && (
        <div className="supplier-directory" aria-label="Lista de fornecedores">
          <div className="supplier-directory__header" aria-hidden="true"><span>Fornecedor</span><span>Contato</span><span>Status</span><span /></div>
          {suppliers.data?.map((supplier) => (
            <Link className="supplier-row" to={`/app/fornecedores/${supplier.id}`} key={supplier.id}>
              <div><strong>{supplier.trade_name || supplier.legal_name}</strong><span>{supplier.trade_name ? supplier.legal_name : supplier.tax_id || 'Documento não informado'}</span></div>
              <div><strong>{supplier.contact_name || supplier.phone || 'Sem contato'}</strong><span>{supplier.email || supplier.phone || 'E-mail não informado'}</span></div>
              <span className={`status-badge status-badge--${supplier.status}`}>{supplier.status === 'active' ? 'Ativo' : 'Inativo'}</span>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
