import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useParams } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { equipmentKeys } from '../equipment/equipmentQueries'
import { formatInventoryCurrency, formatInventoryQuantity } from '../inventory/formatters'
import { inventoryKeys } from '../inventory/inventoryQueries'
import { MaintenanceFinancialSection } from '../payments/MaintenanceFinancialSection'
import { formatReturnDate } from '../returns/formatters'
import { returnKeys } from '../returns/returnQueries'
import { formatMaintenanceCurrency, formatMaintenanceDate } from './formatters'
import {
  addMaintenancePart,
  cancelMaintenance,
  completeMaintenance,
  removeMaintenancePart,
  updateMaintenancePart,
} from './maintenanceApi'
import { MaintenancePartsEditor } from './MaintenancePartsEditor'
import { MaintenancePhotoSection } from './MaintenancePhotoSection'
import {
  maintenanceKeys,
  useMaintenanceDetails,
  useMaintenanceFormOptions,
} from './maintenanceQueries'
import { MaintenanceStatusBadge } from './MaintenanceStatusBadge'
import {
  getMaintenanceTypeLabel,
  isMaintenanceOpen,
} from './types'
import { validateCompletion } from './validation'

export function MaintenanceDetailsPage() {
  const { maintenanceId } = useParams()
  const detailsQuery = useMaintenanceDetails(maintenanceId)
  const optionsQuery = useMaintenanceFormOptions()
  const { organization, maintenance } = detailsQuery
  const queryClient = useQueryClient()
  const location = useLocation()
  const routedSuccess = (location.state as { success?: string } | null)?.success
  const [confirmation, setConfirmation] = useState<'complete' | 'cancel' | null>(null)
  const [cancellationReason, setCancellationReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [isActing, setIsActing] = useState(false)
  const isLoading = organization.isLoading || (
    organization.isSuccess && (maintenance.isLoading || optionsQuery.options.isLoading)
  )
  const error = organization.error ?? maintenance.error ?? optionsQuery.options.error

  if (isLoading) return <PageSkeleton rows={6} />
  if (error || !maintenance.data || !optionsQuery.options.data) {
    return <PageState title="OS indisponível" description={error?.message ?? 'A ordem de serviço não foi encontrada.'} actionLabel="Tentar novamente" onAction={() => { void maintenance.refetch(); void optionsQuery.options.refetch() }} tone="error" />
  }

  const details = maintenance.data
  const open = isMaintenanceOpen(details.status)
  const completionErrors = validateCompletion(details)
  const frozenPartsCost = details.status === 'cancelled'
    ? 0
    : details.parts.reduce(
        (total, part) => total + (part.total_cost_snapshot ?? part.quantity * part.current_average_cost),
        0,
      )

  async function refreshAfterPartChange() {
    await queryClient.invalidateQueries({
      queryKey: maintenanceKeys.detail(organization.data!, details.id),
    })
  }

  async function handleComplete() {
    if (!details.next_return_date) {
      setActionError('Informe a data de reagendamento no relatório antes de concluir.')
      return
    }
    setIsActing(true)
    setActionError(null)
    try {
      await completeMaintenance(organization.data!, details.id, details.next_return_date)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: maintenanceKeys.all }),
        queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
        queryClient.invalidateQueries({ queryKey: equipmentKeys.all }),
        queryClient.invalidateQueries({ queryKey: returnKeys.all }),
      ])
      setActionSuccess(`Manutenção concluída, estoque atualizado e retorno agendado para ${formatReturnDate(details.next_return_date)}.`)
      setConfirmation(null)
    } catch (completeError) {
      setActionError(completeError instanceof Error ? completeError.message : 'Não foi possível concluir a manutenção.')
    } finally {
      setIsActing(false)
    }
  }

  async function handleCancel() {
    if (cancellationReason.trim().length < 3) {
      setActionError('Informe um motivo com pelo menos 3 caracteres.')
      return
    }
    setIsActing(true)
    setActionError(null)
    try {
      await cancelMaintenance(organization.data!, details.id, cancellationReason)
      await queryClient.invalidateQueries({ queryKey: maintenanceKeys.all })
      setActionSuccess('Ordem de serviço cancelada. Nenhum estoque foi movimentado.')
      setConfirmation(null)
    } catch (cancelError) {
      setActionError(cancelError instanceof Error ? cancelError.message : 'Não foi possível cancelar a manutenção.')
    } finally {
      setIsActing(false)
    }
  }

  return (
    <section className="maintenance-details" aria-labelledby="maintenance-order-title">
      <Link className="back-link" to="/app/manutencoes">← Voltar para manutenções</Link>

      <div className="maintenance-details__heading">
        <div className="maintenance-details__identity">
          <span className="maintenance-detail-mark" aria-hidden="true">OS</span>
          <div>
            <span className="eyebrow">{getMaintenanceTypeLabel(details.maintenance_type)} · {formatMaintenanceDate(details.scheduled_at)}</span>
            <h1 id="maintenance-order-title">{details.work_order_number}</h1>
            <MaintenanceStatusBadge status={details.status} />
          </div>
        </div>
        <div className="maintenance-actions">
          <Link className="secondary-button secondary-button--link" to={`/app/manutencoes/${details.id}/imprimir`}>Imprimir OS</Link>
          {open && (
            <>
            <Link className="secondary-button secondary-button--link" to={`/app/manutencoes/${details.id}/editar`}>Editar OS</Link>
            <button className="primary-button primary-button--compact" type="button" onClick={() => { setConfirmation('complete'); setActionError(null) }}>Concluir manutenção</button>
            <button className="danger-text-button" type="button" onClick={() => { setConfirmation('cancel'); setActionError(null) }}>Cancelar OS</button>
            </>
          )}
        </div>
      </div>

      <div className="action-messages" aria-live="polite">
        {(routedSuccess || actionSuccess) && <div className="alert alert--success">{actionSuccess || routedSuccess}</div>}
        {actionError && <div className="alert alert--error">{actionError}</div>}
      </div>

      {confirmation === 'complete' && (
        <section className="maintenance-confirmation" role="alert" aria-labelledby="complete-confirm-title">
          <div><span className="eyebrow">Operação irreversível</span><h2 id="complete-confirm-title">Confirmar conclusão e consumo?</h2><p>Os custos serão congelados, o estoque será baixado, o retorno será criado e esta OS ficará imutável.</p></div>
          <div className="completion-checklist">
            <span>{details.parts.length} {details.parts.length === 1 ? 'item planejado' : 'itens planejados'}</span>
            <strong>{formatInventoryCurrency(frozenPartsCost)}</strong>
            <small>custo estimado do estoque</small>
          </div>
          {completionErrors.length > 0 && <ul className="completion-errors">{completionErrors.map((item) => <li key={item}>{item}</li>)}</ul>}
          <div className="completion-return-summary">
            <span>Reagendamento definido no relatório</span>
            <strong>{details.next_return_date ? formatReturnDate(details.next_return_date) : 'Não informado'}</strong>
          </div>
          <div className="confirmation-actions">
            <button className="primary-button primary-button--compact" type="button" disabled={isActing || completionErrors.length > 0} onClick={() => void handleComplete()}>{isActing ? 'Concluindo…' : 'Concluir e agendar retorno'}</button>
            <button className="secondary-button" type="button" disabled={isActing} onClick={() => setConfirmation(null)}>Voltar</button>
          </div>
        </section>
      )}

      {confirmation === 'cancel' && (
        <section className="maintenance-confirmation maintenance-confirmation--cancel" role="alert" aria-labelledby="cancel-confirm-title">
          <div><span className="eyebrow">Cancelamento rastreável</span><h2 id="cancel-confirm-title">Por que esta OS foi cancelada?</h2><p>O cancelamento não movimentará nem estornará estoque.</p></div>
          <label className="field"><span>Motivo obrigatório</span><textarea rows={3} maxLength={500} value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} autoFocus /></label>
          <div className="confirmation-actions">
            <button className="danger-button" type="button" disabled={isActing} onClick={() => void handleCancel()}>{isActing ? 'Cancelando…' : 'Confirmar cancelamento'}</button>
            <button className="secondary-button" type="button" disabled={isActing} onClick={() => setConfirmation(null)}>Voltar</button>
          </div>
        </section>
      )}

      <div className="maintenance-detail-grid">
        <article className="maintenance-route-card">
          <span className="eyebrow">Rota do atendimento</span>
          <strong>{details.client_name}</strong>
          <Link to={`/app/equipamentos/${details.equipment_id}`}>{details.equipment_name}</Link>
          <span>{details.location_name || 'Sem unidade específica'}</span>
        </article>
        <article className="info-card">
          <span className="eyebrow">Responsabilidade</span>
          <dl>
            <div><dt>Técnico</dt><dd>{details.technician_name}</dd></div>
            <div><dt>Atendimento</dt><dd>{formatMaintenanceDate(details.scheduled_at)}</dd></div>
            <div><dt>Reagendamento</dt><dd>{details.next_return_date ? formatReturnDate(details.next_return_date) : 'Não informado'}</dd></div>
            <div><dt>Valor informado</dt><dd>{formatMaintenanceCurrency(details.total_amount)}</dd></div>
            <div><dt>Peças</dt><dd>{details.part_count}</dd></div>
          </dl>
        </article>
        <article className="info-card maintenance-audit-card">
          <span className="eyebrow">Auditoria</span>
          <dl>
            <div><dt>Criada em</dt><dd>{formatMaintenanceDate(details.created_at)}</dd></div>
            {details.completed_at && <div><dt>Concluída em</dt><dd>{formatMaintenanceDate(details.completed_at)}</dd></div>}
            {details.cancelled_at && <div><dt>Cancelada em</dt><dd>{formatMaintenanceDate(details.cancelled_at)}</dd></div>}
          </dl>
        </article>
      </div>

      {details.status === 'cancelled' && (
        <div className="cancelled-reason"><span className="eyebrow">Motivo do cancelamento</span><p>{details.cancellation_reason}</p></div>
      )}

      <MaintenanceFinancialSection
        organizationId={organization.data!}
        maintenanceId={details.id}
        maintenanceStatus={details.status}
      />

      <section className="maintenance-technical-record" aria-labelledby="technical-record-title">
        <div className="section-heading"><div><span className="eyebrow">Relatório de campo</span><h2 id="technical-record-title">Registro técnico</h2></div></div>
        <div className="technical-record-grid">
          <article><span>01 / Diagnóstico</span><p>{details.diagnosis || 'Ainda não informado.'}</p></article>
          <article><span>02 / Serviço realizado</span><p>{details.service_performed || 'Ainda não informado.'}</p></article>
          <article><span>03 / Observações</span><p>{details.notes || 'Nenhuma observação registrada.'}</p></article>
        </div>
      </section>

      <MaintenancePhotoSection
        organizationId={organization.data!}
        maintenanceId={details.id}
        status={details.status}
      />

      <section className="maintenance-parts" aria-labelledby="maintenance-parts-title">
        <div className="section-heading">
          <div><span className="eyebrow">Consumo de estoque</span><h2 id="maintenance-parts-title">Peças e insumos</h2></div>
          <strong className="parts-total">{formatInventoryCurrency(frozenPartsCost)}</strong>
        </div>

        {open ? (
          <MaintenancePartsEditor
            parts={details.parts}
            inventory={optionsQuery.options.data.inventory}
            onAdd={async (input) => { await addMaintenancePart(organization.data!, details.id, input); await refreshAfterPartChange() }}
            onUpdate={async (partId, quantity) => { await updateMaintenancePart(organization.data!, partId, quantity); await refreshAfterPartChange() }}
            onRemove={async (partId) => { await removeMaintenancePart(organization.data!, partId); await refreshAfterPartChange() }}
          />
        ) : details.parts.length === 0 ? (
          <PageState title="Nenhuma peça utilizada" description="Esta manutenção foi encerrada sem consumo de itens do estoque." />
        ) : details.status === 'cancelled' ? (
          <div className="cancelled-parts-plan">
            <strong>Planejamento não consumido</strong>
            <p>Estas peças estavam previstas quando a OS foi cancelada. Nenhum saldo foi baixado.</p>
            {details.parts.map((part) => (
              <span key={part.id}>{part.item_name} · {formatInventoryQuantity(part.quantity, part.unit_of_measure)}</span>
            ))}
          </div>
        ) : (
          <div className="maintenance-parts-ledger">
            <div className="maintenance-parts-ledger__header" aria-hidden="true"><span>Item</span><span>Quantidade</span><span>Custo congelado</span><span>Total</span></div>
            {details.parts.map((part) => (
              <article key={part.id}>
                <div><strong>{part.item_name}</strong><span>{part.item_sku || 'Sem SKU'}</span></div>
                <strong>{formatInventoryQuantity(part.quantity, part.unit_of_measure)}</strong>
                <div><strong>{formatInventoryCurrency(part.unit_cost_snapshot ?? 0)}</strong><span>por {part.unit_of_measure}</span></div>
                <strong>{formatInventoryCurrency(part.total_cost_snapshot ?? 0)}</strong>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
