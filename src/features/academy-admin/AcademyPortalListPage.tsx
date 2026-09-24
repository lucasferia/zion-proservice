import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { AcademyCommercialStatusBadge, AcademyUserStatusBadge } from './AcademyPortalStatusBadge'
import { useAcademyAdminList } from './academyAdminQueries'
import { academyUserStatuses } from './types'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value))
}

function initials(name: string | null, email: string) {
  return (name || email).split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

export function AcademyPortalListPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [clientId, setClientId] = useState('')
  const [page, setPage] = useState(0)
  const pageSize = 25
  const { summary, options, users, deferredSearch } = useAcademyAdminList({ search, status, clientId, page, pageSize })

  const clients = useMemo(() => {
    const map = new Map<string, string>()
    for (const option of options.data ?? []) map.set(option.client_id, option.client_name)
    return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [options.data])
  const total = users.data?.[0]?.total_count ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const isLoading = summary.isLoading || options.isLoading || users.isLoading
  const error = summary.error ?? options.error ?? users.error

  return (
    <section className="academy-admin-page" aria-labelledby="academy-admin-title">
      <div className="module-heading academy-admin-heading">
        <div>
          <span className="eyebrow">Administração externa · somente owner</span>
          <h1 id="academy-admin-title">Portal das Academias</h1>
          <p>Libere usuários, defina unidades permitidas e controle a situação comercial de cada academia.</p>
        </div>
        <div className="academy-admin-heading__mark" aria-hidden="true"><span>11</span><small>Controle de acesso</small></div>
      </div>

      {summary.data && (
        <div className="academy-admin-metrics" aria-label="Resumo do Portal das Academias">
          <article className="academy-admin-metric academy-admin-metric--pending"><span>Aguardando liberação</span><strong>{summary.data.pending_users}</strong><small>Cadastros para revisar</small></article>
          <article><span>Usuários ativos</span><strong>{summary.data.active_users}</strong><small>Com vínculo configurado</small></article>
          <article className="academy-admin-metric academy-admin-metric--suspended"><span>Usuários suspensos</span><strong>{summary.data.suspended_users}</strong><small>Bloqueio individual</small></article>
          <article className="academy-admin-metric academy-admin-metric--commercial"><span>Academias liberadas</span><strong>{summary.data.active_academies}</strong><small>Ativas ou em teste</small></article>
        </div>
      )}

      <div className="academy-admin-toolbar">
        <label className="search-field" htmlFor="academy-user-search">
          <span className="sr-only">Buscar por nome ou e-mail</span>
          <input id="academy-user-search" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0) }} placeholder="Buscar por nome ou e-mail" autoComplete="off" />
          {search.trim() !== deferredSearch && <span className="search-field__busy" aria-label="Buscando" />}
        </label>
        <label className="academy-admin-filter"><span>Status do usuário</span><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(0) }}><option value="">Todos</option>{academyUserStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="academy-admin-filter"><span>Academia</span><select value={clientId} onChange={(event) => { setClientId(event.target.value); setPage(0) }}><option value="">Todas</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
        <span className="directory-count" aria-live="polite">{users.data ? `${total} ${total === 1 ? 'usuário' : 'usuários'}` : '—'}</span>
      </div>

      {isLoading && <PageSkeleton rows={5} />}
      {!isLoading && error && <PageState title="Não foi possível carregar o Portal das Academias" description={error instanceof Error ? error.message : 'Tente novamente.'} actionLabel="Tentar novamente" onAction={() => void Promise.all([summary.refetch(), options.refetch(), users.refetch()])} tone="error" />}
      {!isLoading && !error && users.data?.length === 0 && <PageState title={search || status || clientId ? 'Nenhum usuário encontrado' : 'Nenhum cadastro externo por enquanto'} description={search || status || clientId ? 'Revise a busca e os filtros selecionados.' : 'Novos cadastros confirmados aparecerão aqui aguardando sua liberação.'} />}

      {!isLoading && !error && Boolean(users.data?.length) && (
        <div className="academy-user-directory" aria-label="Usuários do Portal das Academias">
          <div className="academy-user-directory__header" aria-hidden="true"><span>Usuário</span><span>Acesso</span><span>Academia vinculada</span><span>Situação do Portal</span><span>Atualização</span><span /></div>
          {users.data?.map((user) => (
            <article className="academy-user-row" key={user.user_id}>
              <div className="academy-user-row__identity"><span className="academy-user-avatar" aria-hidden="true">{initials(user.full_name, user.email)}</span><div><strong>{user.full_name || 'Nome não informado'}</strong><span>{user.email}</span>{user.auth_disabled && <small>Identidade desativada no Auth</small>}</div></div>
              <div><AcademyUserStatusBadge status={user.portal_status} /><small>{user.email_confirmed ? 'E-mail confirmado' : 'E-mail não confirmado'}</small></div>
              <div><strong>{user.client_name || 'Ainda não vinculada'}</strong><span>{user.active_location_count} {user.active_location_count === 1 ? 'unidade permitida' : 'unidades permitidas'}</span></div>
              <div><AcademyCommercialStatusBadge status={user.commercial_status} /></div>
              <div><strong>{formatDate(user.updated_at)}</strong><span>Cadastro: {formatDate(user.created_at)}</span></div>
              <Link className="secondary-button secondary-button--link" to={`/app/portal-academias/${user.user_id}`}>Gerenciar</Link>
            </article>
          ))}
        </div>
      )}

      {!isLoading && !error && total > pageSize && (
        <nav className="academy-pagination" aria-label="Paginação de usuários">
          <button className="secondary-button" type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0}>Anterior</button>
          <span>Página {page + 1} de {pageCount}</span>
          <button className="secondary-button" type="button" onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))} disabled={page + 1 >= pageCount}>Próxima</button>
        </nav>
      )}
    </section>
  )
}
