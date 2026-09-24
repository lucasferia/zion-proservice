import { useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { AcademyConfirmDialog } from './AcademyConfirmDialog'
import { AcademyCommercialStatusBadge, AcademyUserStatusBadge } from './AcademyPortalStatusBadge'
import { useAcademyAdminMutations, useAcademyAdminUser } from './academyAdminQueries'
import { academyCommercialStatuses, type AcademyCommercialStatus } from './types'

type Confirmation = 'initial' | 'locations' | 'suspend' | 'reactivate' | 'commercial' | null

const auditLabels: Record<string, string> = {
  initial_configuration_completed: 'Configuração inicial concluída',
  user_activated: 'Usuário ativado',
  user_suspended: 'Usuário suspenso',
  user_reactivated: 'Usuário reativado',
  user_downgraded_no_locations: 'Acesso rebaixado por ausência de unidades',
  location_granted: 'Unidade concedida',
  location_revoked: 'Unidade revogada',
  location_reactivated: 'Unidade reativada',
  commercial_access_changed: 'Situação comercial alterada',
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value))
}

function validateReason(reason: string) {
  const length = reason.trim().length
  return length >= 3 && length <= 500
}

export function AcademyPortalUserPage() {
  const { userId } = useParams()
  const { details, options } = useAcademyAdminUser(userId)
  const mutations = useAcademyAdminMutations(userId ?? '')
  const [clientIdDraft, setClientIdDraft] = useState<string | null>(null)
  const [locationIdsDraft, setLocationIdsDraft] = useState<string[] | null>(null)
  const [commercialStatusDraft, setCommercialStatusDraft] = useState<AcademyCommercialStatus | null>(null)
  const [reasons, setReasons] = useState<Record<Exclude<Confirmation, null>, string>>({ initial: '', locations: '', suspend: '', reactivate: '', commercial: '' })
  const [confirmation, setConfirmation] = useState<Confirmation>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const initialButtonRef = useRef<HTMLButtonElement>(null)
  const locationsButtonRef = useRef<HTMLButtonElement>(null)
  const suspendButtonRef = useRef<HTMLButtonElement>(null)
  const reactivateButtonRef = useRef<HTMLButtonElement>(null)
  const commercialButtonRef = useRef<HTMLButtonElement>(null)

  const clients = useMemo(() => {
    const map = new Map<string, string>()
    for (const option of options.data ?? []) map.set(option.client_id, option.client_name)
    return [...map].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [options.data])
  const clientId = clientIdDraft ?? details.data?.client?.id ?? ''
  const locationIds = locationIdsDraft ?? details.data?.locations.filter((location) => location.status === 'active').map((location) => location.id) ?? []
  const commercialStatus = commercialStatusDraft ?? details.data?.commercial?.status ?? 'pending'
  const availableLocations = (options.data ?? []).filter((option) => option.client_id === clientId)
  const selectedClient = clients.find((client) => client.id === clientId)
  const selectedLocationNames = availableLocations.filter((location) => locationIds.includes(location.client_location_id)).map((location) => location.client_location_name)
  const isLoading = details.isLoading || options.isLoading
  const error = details.error ?? options.error
  const busy = mutations.configure.isPending || mutations.changeStatus.isPending || mutations.replaceLocations.isPending || mutations.changeCommercial.isPending
  const mutationError = mutations.configure.error ?? mutations.changeStatus.error ?? mutations.replaceLocations.error ?? mutations.changeCommercial.error
  const user = details.data
  const isInitial = Boolean(user && !user.organizationId)
  const activeLocationCount = user?.locations.filter((location) => location.status === 'active').length ?? 0

  function resetFeedback() {
    setSuccess(null)
    setActionError(null)
    mutations.configure.reset()
    mutations.changeStatus.reset()
    mutations.replaceLocations.reset()
    mutations.changeCommercial.reset()
  }

  function toggleLocation(locationId: string) {
    resetFeedback()
    setLocationIdsDraft((currentDraft) => {
      const current = currentDraft ?? locationIds
      return current.includes(locationId) ? current.filter((id) => id !== locationId) : [...current, locationId]
    })
  }

  function review(action: Exclude<Confirmation, null>) {
    resetFeedback()
    if (!validateReason(reasons[action])) {
      setActionError('Informe um motivo entre 3 e 500 caracteres.')
      return
    }
    if ((action === 'initial' || action === 'locations') && !clientId) {
      setActionError('Selecione uma academia antes de continuar.')
      return
    }
    if (action === 'initial' && locationIds.length === 0) {
      setActionError('Selecione ao menos uma unidade para concluir a liberação inicial.')
      return
    }
    if (action === 'reactivate' && locationIds.length === 0) {
      setActionError('Adicione ao menos uma unidade válida antes de reativar o usuário.')
      return
    }
    setConfirmation(action)
  }

  async function confirmAction() {
    if (!user || !confirmation) return
    const reason = reasons[confirmation]
    try {
      if (confirmation === 'initial') {
        await mutations.configure.mutateAsync({
          userId: user.userId,
          clientId,
          locationIds,
          commercialStatus: commercialStatus as 'pending' | 'trialing' | 'active',
          reason,
          expectedUpdatedAt: user.updatedAt,
        })
        setSuccess(commercialStatus === 'pending' ? 'Vínculos preparados. O acesso continua aguardando liberação comercial.' : 'Usuário configurado e liberado com sucesso.')
      } else if (confirmation === 'locations') {
        await mutations.replaceLocations.mutateAsync({ userId: user.userId, clientId, locationIds, reason, expectedUpdatedAt: user.updatedAt })
        setSuccess(locationIds.length === 0 ? 'Unidades revogadas. O usuário voltou a aguardar liberação.' : 'Unidades permitidas atualizadas com sucesso.')
      } else if (confirmation === 'suspend' || confirmation === 'reactivate') {
        await mutations.changeStatus.mutateAsync({
          userId: user.userId,
          status: confirmation === 'suspend' ? 'suspended' : 'active',
          reason,
          expectedUpdatedAt: user.updatedAt,
        })
        setSuccess(confirmation === 'suspend' ? 'Usuário suspenso com efeito imediato.' : 'Usuário reativado. A situação comercial foi preservada.')
      } else if (confirmation === 'commercial' && user.client && user.commercial) {
        const affected = await mutations.changeCommercial.mutateAsync({
          clientId: user.client.id,
          status: commercialStatus,
          reason,
          expectedUpdatedAt: user.commercial.updatedAt,
        })
        setSuccess(`Situação do Portal atualizada. ${affected} ${affected === 1 ? 'usuário foi reavaliado' : 'usuários foram reavaliados'}.`)
      }
      setReasons((current) => ({ ...current, [confirmation]: '' }))
      setClientIdDraft(null)
      setLocationIdsDraft(null)
      setCommercialStatusDraft(null)
      setConfirmation(null)
    } catch (nextError) {
      setConfirmation(null)
      setActionError(nextError instanceof Error ? nextError.message : 'Não foi possível concluir a operação.')
    }
  }

  if (isLoading) return <section className="academy-admin-page"><PageSkeleton rows={7} /></section>
  if (error || !user) return <section className="academy-admin-page"><PageState title="Não foi possível carregar este usuário" description={error instanceof Error ? error.message : 'O registro não foi encontrado.'} actionLabel="Tentar novamente" onAction={() => void Promise.all([details.refetch(), options.refetch()])} tone="error" /></section>

  const reasonField = (action: Exclude<Confirmation, null>, label: string) => (
    <label className="field academy-admin-reason">
      <span>{label}</span>
      <textarea value={reasons[action]} onChange={(event) => setReasons((current) => ({ ...current, [action]: event.target.value }))} maxLength={500} placeholder="Descreva de forma objetiva o motivo desta ação" />
      <small>{reasons[action].trim().length}/500 · obrigatório para manter o histórico rastreável</small>
    </label>
  )

  return (
    <section className="academy-admin-page academy-admin-detail" aria-labelledby="academy-user-title">
      <Link className="back-link" to="/app/portal-academias">← Voltar ao Portal das Academias</Link>
      <div className="academy-admin-detail__hero">
        <div>
          <span className="eyebrow">Usuário externo</span>
          <h1 id="academy-user-title">{user.fullName || 'Nome não informado'}</h1>
          <p>{user.email}</p>
        </div>
        <AcademyUserStatusBadge status={user.status} />
      </div>

      {success && <div className="alert alert--success" role="status" tabIndex={-1}>{success}</div>}
      {(actionError || mutationError) && <div className="alert alert--error" role="alert">{actionError ?? (mutationError instanceof Error ? mutationError.message : 'Não foi possível concluir a operação.')}</div>}
      {user.authDisabled && <div className="academy-admin-auth-warning"><strong>Identidade desativada no Supabase Auth</strong><span>Você pode preparar os vínculos, mas a reativação da identidade deve ser feita fora do navegador por um administrador autorizado.</span></div>}

      <div className="academy-admin-facts">
        <article><span>Confirmação de e-mail</span><strong>{user.emailConfirmed ? 'Confirmado' : 'Não confirmado'}</strong></article>
        <article><span>Academia vinculada</span><strong>{user.client?.name ?? 'Ainda não vinculada'}</strong></article>
        <article><span>Unidades permitidas</span><strong>{activeLocationCount}</strong></article>
        <article><span>Situação do Portal</span><AcademyCommercialStatusBadge status={user.commercial?.status ?? null} /></article>
        <article><span>Cadastro</span><strong>{formatDate(user.createdAt)}</strong></article>
        <article><span>Última alteração</span><strong>{formatDate(user.updatedAt)}</strong></article>
      </div>

      <section className="academy-admin-explainer" aria-labelledby="access-rules-title">
        <div><span className="academy-admin-explainer__number">01</span><strong>Usuário ativo</strong><p>Define se esta pessoa está liberada ou suspensa individualmente.</p></div>
        <div><span className="academy-admin-explainer__number">02</span><strong>Unidades permitidas</strong><p>Limita quais unidades desta academia a pessoa poderá acessar.</p></div>
        <div><span className="academy-admin-explainer__number">03</span><strong>Situação do Portal</strong><p>É comercial e afeta todos os usuários válidos vinculados à academia.</p></div>
        <h2 id="access-rules-title" className="sr-only">Como o acesso é determinado</h2>
      </section>

      {isInitial ? (
        <section className="academy-admin-panel academy-admin-panel--onboarding" aria-labelledby="initial-setup-title">
          <div className="section-heading"><div><span className="eyebrow">Configuração inicial</span><h2 id="initial-setup-title">Liberar acesso</h2><p>Selecione a academia, as unidades e a situação comercial. Tudo será salvo na mesma operação.</p></div><span className="academy-admin-panel__coordinate">PASSO ÚNICO</span></div>
          <div className="academy-admin-form-grid">
            <label className="field"><span>Academia</span><select value={clientId} onChange={(event) => { setClientIdDraft(event.target.value); setLocationIdsDraft([]); resetFeedback() }}><option value="">Selecione uma academia</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
            <label className="field"><span>Situação comercial inicial</span><select value={commercialStatus} onChange={(event) => setCommercialStatusDraft(event.target.value as AcademyCommercialStatus)}><option value="pending">Manter aguardando liberação</option><option value="trialing">Liberar período de teste</option><option value="active">Liberar Portal ativo</option></select></label>
          </div>
          <fieldset className="academy-location-picker"><legend>Unidades permitidas</legend>{!clientId && <p>Selecione uma academia para visualizar suas unidades.</p>}{clientId && availableLocations.length === 0 && <p>Esta academia não possui unidades ativas. Cadastre uma unidade antes de liberar o acesso.</p>}{availableLocations.map((location) => <label key={location.client_location_id}><input type="checkbox" checked={locationIds.includes(location.client_location_id)} onChange={() => toggleLocation(location.client_location_id)} /><span><strong>{location.client_location_name}</strong><small>{location.city}</small></span></label>)}</fieldset>
          {reasonField('initial', 'Motivo da configuração')}
          <button ref={initialButtonRef} className="primary-button primary-button--compact" type="button" onClick={() => review('initial')}>Revisar liberação <span aria-hidden="true">→</span></button>
        </section>
      ) : (
        <div className="academy-admin-management-grid">
          <section className="academy-admin-panel" aria-labelledby="locations-title">
            <div className="section-heading"><div><span className="eyebrow">Escopo individual</span><h2 id="locations-title">Unidades permitidas</h2><p>Revogar a última unidade devolve o usuário para “Aguardando liberação”.</p></div></div>
            <fieldset className="academy-location-picker"><legend>Unidades de {user.client?.name}</legend>{availableLocations.map((location) => <label key={location.client_location_id}><input type="checkbox" checked={locationIds.includes(location.client_location_id)} onChange={() => toggleLocation(location.client_location_id)} /><span><strong>{location.client_location_name}</strong><small>{location.city}</small></span></label>)}</fieldset>
            {reasonField('locations', 'Motivo da alteração das unidades')}
            <button ref={locationsButtonRef} className="secondary-button" type="button" onClick={() => review('locations')}>Revisar unidades</button>
          </section>

          <section className="academy-admin-panel" aria-labelledby="user-access-title">
            <div className="section-heading"><div><span className="eyebrow">Acesso individual</span><h2 id="user-access-title">Situação do usuário</h2><p>Esta ação afeta somente {user.fullName || 'este usuário'} e não altera o contrato da academia.</p></div></div>
            <AcademyUserStatusBadge status={user.status} />
            {reasonField(user.status === 'suspended' ? 'reactivate' : 'suspend', user.status === 'suspended' ? 'Motivo da reativação' : 'Motivo da suspensão')}
            {user.status === 'suspended' ? <button ref={reactivateButtonRef} className="primary-button primary-button--compact" type="button" onClick={() => review('reactivate')}>Reativar usuário</button> : <button ref={suspendButtonRef} className="danger-text-button" type="button" onClick={() => review('suspend')}>Suspender usuário</button>}
          </section>

          {user.commercial && user.client && (
            <section className="academy-admin-panel academy-admin-panel--commercial" aria-labelledby="commercial-title">
              <div className="section-heading"><div><span className="eyebrow">Impacto coletivo</span><h2 id="commercial-title">Situação do Portal</h2><p>Alterar esta situação pode afetar {user.commercial.affectedUsers} {user.commercial.affectedUsers === 1 ? 'usuário ativo' : 'usuários ativos'} de {user.client.name}.</p></div></div>
              <label className="field"><span>Nova situação comercial</span><select value={commercialStatus} onChange={(event) => setCommercialStatusDraft(event.target.value as AcademyCommercialStatus)}>{academyCommercialStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              {reasonField('commercial', 'Motivo da alteração comercial')}
              <button ref={commercialButtonRef} className="secondary-button" type="button" onClick={() => review('commercial')}>Revisar alteração comercial</button>
            </section>
          )}
        </div>
      )}

      {user.locations.length > 0 && (
        <section className="academy-admin-history" aria-labelledby="location-history-title"><div className="section-heading"><div><span className="eyebrow">Rastreabilidade</span><h2 id="location-history-title">Histórico de unidades</h2></div></div><div className="academy-location-history">{user.locations.map((location) => <article key={`${location.id}-${location.status}`}><div><strong>{location.name}</strong><span>{location.city}</span></div><span className={`academy-location-state academy-location-state--${location.status}`}>{location.status === 'active' ? 'Permitida' : 'Revogada'}</span><dl><div><dt>Concedida em</dt><dd>{formatDate(location.grantedAt)} · {location.grantedByName || 'Owner'}</dd></div>{location.revokedAt && <div><dt>Revogada em</dt><dd>{formatDate(location.revokedAt)} · {location.revokedByName || 'Owner'}</dd></div>}{location.revocationReason && <div><dt>Motivo</dt><dd>{location.revocationReason}</dd></div>}</dl></article>)}</div></section>
      )}

      <section className="academy-admin-history" aria-labelledby="audit-title"><div className="section-heading"><div><span className="eyebrow">Registro administrativo</span><h2 id="audit-title">Histórico de ações</h2></div></div>{user.auditEvents.length === 0 ? <p className="academy-admin-history__empty">Nenhuma ação administrativa registrada ainda.</p> : <ol className="academy-audit-timeline">{user.auditEvents.map((event) => <li key={event.id}><span aria-hidden="true" /><div><strong>{auditLabels[event.action] ?? event.action}</strong><p>{event.reason}</p><small>{formatDate(event.createdAt)} · {event.performedByName || 'Owner'}</small></div></li>)}</ol>}</section>

      <AcademyConfirmDialog
        open={confirmation !== null}
        title={confirmation === 'initial' ? 'Confirmar liberação inicial' : confirmation === 'locations' ? 'Confirmar unidades permitidas' : confirmation === 'suspend' ? 'Suspender este usuário?' : confirmation === 'reactivate' ? 'Reativar este usuário?' : 'Alterar situação comercial?'}
        description={confirmation === 'commercial' ? `A mudança será aplicada à academia ${user.client?.name} e poderá afetar ${user.commercial?.affectedUsers ?? 0} usuários.` : confirmation === 'locations' && locationIds.length === 0 ? 'A última unidade será revogada e o usuário voltará a aguardar liberação.' : confirmation === 'suspend' ? 'Esta pessoa será bloqueada imediatamente. Os demais usuários e a situação comercial da academia não serão alterados.' : 'Revise o impacto abaixo antes de confirmar.'}
        confirmLabel={confirmation === 'initial' ? 'Confirmar liberação' : confirmation === 'suspend' ? 'Suspender usuário' : confirmation === 'reactivate' ? 'Reativar usuário' : confirmation === 'commercial' ? 'Confirmar situação' : 'Salvar unidades'}
        tone={confirmation === 'suspend' || (confirmation === 'locations' && locationIds.length === 0) || (confirmation === 'commercial' && ['past_due', 'suspended', 'cancelled'].includes(commercialStatus)) ? 'danger' : 'primary'}
        busy={busy}
        onConfirm={() => void confirmAction()}
        onClose={() => setConfirmation(null)}
        returnFocusTo={confirmation === 'initial' ? initialButtonRef : confirmation === 'locations' ? locationsButtonRef : confirmation === 'suspend' ? suspendButtonRef : confirmation === 'reactivate' ? reactivateButtonRef : commercialButtonRef}
      >
        <div className="academy-dialog__review">
          <div><span>Academia</span><strong>{selectedClient?.name ?? user.client?.name ?? 'Não selecionada'}</strong></div>
          {(confirmation === 'initial' || confirmation === 'locations') && <div><span>Unidades</span><strong>{selectedLocationNames.length ? selectedLocationNames.join(', ') : 'Nenhuma unidade'}</strong></div>}
          {(confirmation === 'initial' || confirmation === 'commercial') && <div><span>Situação do Portal</span><strong>{academyCommercialStatuses.find((item) => item.value === commercialStatus)?.label}</strong></div>}
          <div><span>Motivo</span><strong>{confirmation ? reasons[confirmation] : ''}</strong></div>
        </div>
      </AcademyConfirmDialog>
    </section>
  )
}
