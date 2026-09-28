import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { useAuth } from '../auth/auth-context'
import { EquipmentStatusBadge } from '../equipment/EquipmentStatusBadge'
import { PortalAuthorizationError } from '../portal/portalApi'
import { usePortalContext } from '../portal/portal-context'
import { createPortalEquipment, PortalEquipmentNotFoundError } from './portalEquipmentApi'
import { PortalEquipmentForm } from './PortalEquipmentForm'
import { portalEquipmentKeys, usePortalEquipmentDetails, usePortalEquipmentList } from './portalEquipmentQueries'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(value))
}

function useAuthorizationRefresh(error: unknown) {
  const { refresh } = usePortalContext()
  useEffect(() => {
    if (error instanceof PortalAuthorizationError) void refresh()
  }, [error, refresh])
}

export function PortalEquipmentListPage() {
  const { session } = useAuth()
  const [search, setSearch] = useState('')
  const { selectedUnit: contextUnit } = usePortalContext()
  const [pagination, setPagination] = useState({ unitId: contextUnit?.id ?? '', page: 1 })
  const page = pagination.unitId === contextUnit?.id ? pagination.page : 1
  const { query, selectedUnit, deferredSearch } = usePortalEquipmentList(session?.user.id ?? '', search, page)
  const location = useLocation()
  const success = (location.state as { success?: string } | null)?.success
  useAuthorizationRefresh(query.error)

  return (
    <div className="portal-page portal-equipment-page">
      <header className="portal-page-heading portal-equipment-heading">
        <div><span className="eyebrow">Parque da unidade</span><h1>Equipamentos</h1></div>
        <div className="portal-heading-action"><p>Consulte e cadastre equipamentos vinculados à unidade ativa.</p><Link to="/portal/equipamentos/novo">Novo equipamento <span aria-hidden="true">+</span></Link></div>
      </header>
      {success && <div className="alert alert--success" role="status">{success}</div>}
      <section className="portal-equipment-toolbar" aria-label="Busca de equipamentos">
        <label htmlFor="portal-equipment-search"><span>Buscar na unidade</span><input id="portal-equipment-search" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPagination({ unitId: selectedUnit?.id ?? '', page: 1 }) }} placeholder="Nome, marca, modelo, série ou patrimônio" autoComplete="off" /></label>
        <div><span>{selectedUnit?.name}</span><strong>{query.data ? `${query.data.total} ${query.data.total === 1 ? 'equipamento' : 'equipamentos'}` : '—'}</strong></div>
      </section>
      {(query.isLoading || query.isFetching && !query.data) && <PageSkeleton rows={5} />}
      {!query.isLoading && query.error && !(query.error instanceof PortalAuthorizationError) && (
        <PageState tone="error" title="Não foi possível carregar os equipamentos" description={query.error.message} actionLabel="Tentar novamente" onAction={() => void query.refetch()} />
      )}
      {query.error instanceof PortalAuthorizationError && <PageSkeleton rows={4} />}
      {!query.isLoading && !query.error && query.data?.items.length === 0 && (
        <PageState title={deferredSearch ? 'Nenhum equipamento encontrado' : 'Nenhum equipamento nesta unidade'} description={deferredSearch ? 'Revise os termos da busca.' : 'Cadastre o primeiro equipamento para iniciar o parque desta unidade.'} />
      )}
      {!query.error && Boolean(query.data?.items.length) && (
        <div className="portal-equipment-grid" aria-live="polite">
          {query.data?.items.map((item, index) => (
            <Link to={`/portal/equipamentos/${item.id}`} className="portal-equipment-card" key={item.id}>
              <span className="portal-equipment-card__index">{String((page - 1) * query.data.pageSize + index + 1).padStart(2, '0')}</span>
              <div><span className="eyebrow">{item.category}</span><h2>{item.name}</h2><p>{[item.brand, item.model].filter(Boolean).join(' · ') || 'Marca e modelo não informados'}</p></div>
              <dl><div><dt>Patrimônio</dt><dd>{item.asset_tag || '—'}</dd></div><div><dt>Série</dt><dd>{item.serial_number || '—'}</dd></div></dl>
              <footer><EquipmentStatusBadge status={item.status} /><span>Ver detalhes →</span></footer>
            </Link>
          ))}
        </div>
      )}
      {query.data && query.data.pageCount > 1 && (
        <nav className="portal-pagination" aria-label="Paginação de equipamentos">
          <button type="button" disabled={page === 1 || query.isFetching} onClick={() => setPagination({ unitId: selectedUnit?.id ?? '', page: page - 1 })}>← Anterior</button>
          <span>Página <strong>{page}</strong> de {query.data.pageCount}</span>
          <button type="button" disabled={page >= query.data.pageCount || query.isFetching} onClick={() => setPagination({ unitId: selectedUnit?.id ?? '', page: page + 1 })}>Próxima →</button>
        </nav>
      )}
    </div>
  )
}

export function PortalEquipmentDetailsPage() {
  const { equipmentId } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { query } = usePortalEquipmentDetails(session?.user.id ?? '', equipmentId)
  useAuthorizationRefresh(query.error)
  if (query.isLoading || query.error instanceof PortalAuthorizationError) return <PageSkeleton rows={5} />
  if (query.error || !query.data) {
    const unavailable = query.error instanceof PortalEquipmentNotFoundError
    return <PageState tone="error" title={unavailable ? 'Equipamento indisponível' : 'Não foi possível carregar o equipamento'} description={query.error?.message ?? 'O equipamento não foi encontrado.'} actionLabel="Voltar para equipamentos" onAction={() => navigate('/portal/equipamentos')} />
  }
  const item = query.data
  const success = (location.state as { success?: string } | null)?.success
  return (
    <div className="portal-page portal-equipment-detail">
      <Link className="portal-back-link" to="/portal/equipamentos">← Voltar para equipamentos</Link>
      {success && <div className="alert alert--success" role="status">{success}</div>}
      <header><div><span className="eyebrow">{item.category}</span><h1>{item.name}</h1><p>{item.location_name}</p></div><EquipmentStatusBadge status={item.status} /></header>
      <section className="portal-equipment-facts" aria-label="Identificação do equipamento">
        <article><span>Marca</span><strong>{item.brand || 'Não informada'}</strong></article>
        <article><span>Modelo</span><strong>{item.model || 'Não informado'}</strong></article>
        <article><span>Número de série</span><strong>{item.serial_number || 'Não informado'}</strong></article>
        <article><span>Patrimônio</span><strong>{item.asset_tag || 'Não informado'}</strong></article>
        <article><span>Cadastro</span><strong>{formatDate(item.created_at)}</strong></article>
        <article><span>Unidade</span><strong>{item.location_name}</strong></article>
      </section>
      {item.notes && <section className="portal-equipment-notes"><span className="eyebrow">Observações do cadastro</span><p>{item.notes}</p></section>}
      <section className="portal-equipment-coming"><span className="portal-panel-index">PRÓX.</span><div><span className="eyebrow">Continuidade</span><h2>Histórico e solicitações</h2><p>O histórico de serviços e as solicitações de manutenção serão disponibilizados em próximas etapas.</p></div></section>
    </div>
  )
}

export function CreatePortalEquipmentPage() {
  const { selectedUnit, refresh } = usePortalContext()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  if (!selectedUnit) return null
  return (
    <div className="portal-page portal-equipment-create">
      <Link className="portal-back-link" to="/portal/equipamentos">← Voltar para equipamentos</Link>
      <header className="portal-page-heading"><div><span className="eyebrow">Novo ativo</span><h1>Cadastrar equipamento</h1></div><p>O cadastro será associado à unidade ativa. Organização, academia, autoria e origem são definidas com segurança pelo sistema.</p></header>
      <PortalEquipmentForm unitName={selectedUnit.name} onSubmit={async (input) => {
        try {
          const id = await createPortalEquipment(selectedUnit.id, input)
          await queryClient.invalidateQueries({ queryKey: portalEquipmentKeys.lists() })
          navigate(`/portal/equipamentos/${id}`, { replace: true, state: { success: 'Equipamento cadastrado com sucesso.' } })
        } catch (error) {
          if (error instanceof PortalAuthorizationError) {
            queryClient.removeQueries({ queryKey: portalEquipmentKeys.all })
            await refresh()
          }
          throw error
        }
      }} />
    </div>
  )
}
