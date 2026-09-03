import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { deleteInventoryItem } from './inventoryApi'
import {
  formatInventoryCurrency,
  formatInventoryQuantity,
  formatMovementDate,
} from './formatters'
import { InventorySituationBadge } from './InventorySituationBadge'
import { inventoryKeys, useInventoryItemDetails } from './inventoryQueries'
import { getInventoryItemStatusLabel } from './types'

export function InventoryDetailsPage() {
  const { itemId } = useParams()
  const { organization, item } = useInventoryItemDetails(itemId)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const success = (location.state as { success?: string } | null)?.success
  const [archivePending, setArchivePending] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const isLoading = organization.isLoading || (organization.isSuccess && item.isLoading)
  const error = organization.error ?? item.error

  if (isLoading) return <PageSkeleton rows={5} />
  if (error || !item.data) {
    return <PageState title="Item indisponível" description={error?.message ?? 'O item não foi encontrado.'} actionLabel="Tentar novamente" onAction={() => void (organization.isError ? organization.refetch() : item.refetch())} tone="error" />
  }

  const details = item.data

  async function handleDelete() {
    setIsArchiving(true)
    setActionError(null)
    try {
      await deleteInventoryItem(organization.data!, details.id)
      await queryClient.invalidateQueries({ queryKey: inventoryKeys.all })
      navigate('/app/estoque', { replace: true, state: { success: 'Item excluído com sucesso.' } })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível excluir o item.')
      setArchivePending(false)
      setIsArchiving(false)
    }
  }

  return (
    <section className="inventory-details" aria-labelledby="inventory-item-name">
      <Link className="back-link" to="/app/estoque">← Voltar para estoque</Link>
      <div className="inventory-details__heading">
        <div className="inventory-details__identity">
          <span className="inventory-detail-mark" aria-hidden="true">ST</span>
          <div>
            <span className="eyebrow">{details.category || 'Sem categoria'} · {getInventoryItemStatusLabel(details.status)}</span>
            <h1 id="inventory-item-name">{details.name}</h1>
            <InventorySituationBadge situation={details.stock_situation} />
          </div>
        </div>
        <div className="client-details__actions inventory-details__actions">
          <Link className="primary-button primary-button--link primary-button--compact" to={`/app/estoque/${details.id}/movimentar`}>Movimentar <span aria-hidden="true">±</span></Link>
          <Link className="secondary-button secondary-button--link" to={`/app/estoque/${details.id}/editar`}>Editar item</Link>
          {!archivePending ? (
            <button className="danger-text-button" type="button" onClick={() => setArchivePending(true)}>Excluir item</button>
          ) : (
            <div className="archive-confirm" role="alert">
              <span>Excluir item e movimentações vinculadas?</span>
              <button type="button" onClick={() => void handleDelete()} disabled={isArchiving}>{isArchiving ? 'Excluindo…' : 'Sim, excluir definitivamente'}</button>
              <button type="button" onClick={() => setArchivePending(false)} disabled={isArchiving}>Cancelar</button>
            </div>
          )}
        </div>
      </div>

      <div className="action-messages" aria-live="polite">
        {success && <div className="alert alert--success">{success}</div>}
        {actionError && <div className="alert alert--error">{actionError}</div>}
      </div>

      <div className="inventory-detail-grid">
        <article className="inventory-balance-card">
          <span className="eyebrow">Saldo disponível</span>
          <strong>{formatInventoryQuantity(details.current_quantity)}</strong>
          <span>{details.unit_of_measure}</span>
          <div className="inventory-level-track" aria-hidden="true"><span style={{ width: `${Math.min(100, details.minimum_stock > 0 ? details.current_quantity / details.minimum_stock * 100 : 100)}%` }} /></div>
          <small>Mínimo definido: {formatInventoryQuantity(details.minimum_stock, details.unit_of_measure)}</small>
        </article>
        <article className="info-card">
          <span className="eyebrow">Cadastro</span>
          <dl>
            <div><dt>SKU</dt><dd>{details.sku || 'Não informado'}</dd></div>
            <div><dt>Categoria</dt><dd>{details.category || 'Não informada'}</dd></div>
            <div><dt>Custo médio</dt><dd>{formatInventoryCurrency(details.average_unit_cost)}</dd></div>
            <div><dt>Status</dt><dd>{getInventoryItemStatusLabel(details.status)}</dd></div>
          </dl>
        </article>
        <article className="info-card info-card--notes inventory-notes-card">
          <span className="eyebrow">Observações</span>
          <p>{details.notes || 'Nenhuma observação registrada.'}</p>
        </article>
      </div>

      <section className="inventory-history" aria-labelledby="inventory-history-title">
        <div className="section-heading">
          <div><span className="eyebrow">Livro razão</span><h2 id="inventory-history-title">Movimentações</h2></div>
          <Link className="secondary-button secondary-button--link" to={`/app/estoque/${details.id}/movimentar`}>Nova movimentação</Link>
        </div>

        {details.movements.length === 0 ? (
          <PageState title="Nenhuma movimentação registrada" description="Registre uma entrada para criar o primeiro saldo deste item." />
        ) : (
          <div className="movement-ledger">
            <div className="movement-ledger__header" aria-hidden="true"><span>Data e tipo</span><span>Variação</span><span>Saldo</span><span>Responsável e motivo</span></div>
            {details.movements.map((movement) => (
              <article className="movement-row" key={movement.id}>
                <div><strong>{movement.movement_type === 'entry' ? 'Entrada' : movement.movement_type === 'maintenance_use' ? 'Uso em manutenção' : 'Ajuste manual'}</strong><span>{formatMovementDate(movement.created_at)}</span></div>
                <strong className={movement.quantity_delta > 0 ? 'movement-positive' : 'movement-negative'}>{movement.quantity_delta > 0 ? '+' : ''}{formatInventoryQuantity(movement.quantity_delta, details.unit_of_measure)}</strong>
                <div><strong>{formatInventoryQuantity(movement.resulting_quantity)}</strong><span>antes: {formatInventoryQuantity(movement.previous_quantity)}</span></div>
                <div><strong>{movement.created_by_name}</strong><span>{movement.reason || 'Sem observação'}</span></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
