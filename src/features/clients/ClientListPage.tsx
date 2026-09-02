import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { useClients } from './clientQueries'

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

export function ClientListPage() {
  const [search, setSearch] = useState('')
  const { organization, clients, deferredSearch } = useClients(search)
  const location = useLocation()
  const success = (location.state as { success?: string } | null)?.success

  const isLoading = organization.isLoading || (organization.isSuccess && clients.isLoading)
  const error = organization.error ?? clients.error

  return (
    <section className="clients-page" aria-labelledby="clients-title">
      <div className="module-heading">
        <div>
          <span className="eyebrow">Relacionamento operacional</span>
          <h1 id="clients-title">Clientes</h1>
          <p>Cadastre contatos e organize os endereços onde o atendimento acontece.</p>
        </div>
        <Link className="primary-button primary-button--link" to="/app/clientes/novo">
          Novo cliente <span aria-hidden="true">+</span>
        </Link>
      </div>

      {success && <div className="alert alert--success" role="status">{success}</div>}

      <div className="directory-toolbar">
        <label className="search-field" htmlFor="client-search">
          <SearchIcon />
          <span className="sr-only">Buscar clientes</span>
          <input
            id="client-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, telefone ou cidade"
            autoComplete="off"
          />
          {search !== deferredSearch && <span className="search-field__busy" aria-label="Buscando" />}
        </label>
        <span className="directory-count" aria-live="polite">
          {clients.data ? `${clients.data.length} ${clients.data.length === 1 ? 'cliente' : 'clientes'}` : '—'}
        </span>
      </div>

      {isLoading && <PageSkeleton rows={5} />}

      {!isLoading && error && (
        <PageState
          title="Não foi possível carregar os clientes"
          description={error instanceof Error ? error.message : 'Tente novamente em alguns instantes.'}
          actionLabel="Tentar novamente"
          onAction={() => void (organization.isError ? organization.refetch() : clients.refetch())}
          tone="error"
        />
      )}

      {!isLoading && !error && clients.data?.length === 0 && (
        <PageState
          title={search ? 'Nenhum cliente encontrado' : 'Sua carteira começa aqui'}
          description={
            search
              ? 'Revise o nome, telefone ou cidade informados.'
              : 'Cadastre o primeiro cliente para começar a organizar as unidades de atendimento.'
          }
        />
      )}

      {!isLoading && !error && Boolean(clients.data?.length) && (
        <div className="client-directory" aria-label="Lista de clientes">
          <div className="client-directory__header" aria-hidden="true">
            <span>Cliente</span>
            <span>Contato</span>
            <span>Unidades</span>
            <span />
          </div>
          {clients.data?.map((client, index) => (
            <Link
              className="client-row"
              to={`/app/clientes/${client.id}`}
              key={client.id}
              style={{ '--row-index': index } as React.CSSProperties}
            >
              <div className="client-row__identity">
                <span className="client-avatar" aria-hidden="true">
                  {client.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <strong>{client.name}</strong>
                  <span>{client.document || 'Documento não informado'}</span>
                </div>
              </div>
              <div className="client-row__contact">
                <strong>{client.phone || 'Sem telefone'}</strong>
                <span>{client.email || 'Sem e-mail'}</span>
              </div>
              <div className="client-row__locations">
                <strong>{client.location_count}</strong>
              </div>
              <span className="client-row__arrow"><ArrowIcon /></span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

