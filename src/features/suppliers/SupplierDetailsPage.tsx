import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { inventoryKeys } from '../inventory/inventoryQueries'
import { archiveSupplier, setInventoryItemSupplier } from './supplierApi'
import { SupplierInventoryLinkSection } from './SupplierInventoryLinkSection'
import { supplierKeys, useSupplier } from './supplierQueries'
import { supplierStatusLabel } from './types'

export function SupplierDetailsPage() {
  const { supplierId } = useParams()
  const { organization, supplier, inventory } = useSupplier(supplierId)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [isSavingLink, setIsSavingLink] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const success = (location.state as { success?: string } | null)?.success
  const error = organization.error ?? supplier.error ?? inventory.error
  if (organization.isLoading || (organization.isSuccess && (supplier.isLoading || inventory.isLoading))) return <PageSkeleton rows={4} />
  if (error || !organization.data || !supplier.data || !inventory.data) return <PageState title="Fornecedor indisponível" description={error?.message ?? 'O fornecedor não foi encontrado.'} actionLabel="Tentar novamente" onAction={() => { void organization.refetch(); void supplier.refetch(); void inventory.refetch() }} tone="error" />

  const details = supplier.data
  async function handleArchive() {
    setIsArchiving(true)
    setActionError(null)
    try {
      await archiveSupplier(organization.data!, details.id)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: supplierKeys.all }),
        queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
      ])
      navigate('/app/fornecedores', { replace: true, state: { success: 'Fornecedor arquivado com sucesso.' } })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível arquivar o fornecedor.')
      setIsArchiving(false)
      setConfirmArchive(false)
    }
  }

  async function handleSupplierLink(itemId: string, nextSupplierId: string | null) {
    setIsSavingLink(true)
    setActionError(null)
    setActionSuccess(null)
    try {
      await setInventoryItemSupplier(organization.data!, itemId, nextSupplierId)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: supplierKeys.inventory(organization.data!, details.id) }),
        queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
      ])
      setActionSuccess(nextSupplierId ? 'Item vinculado ao fornecedor.' : 'Vínculo removido. O item continua no estoque.')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível atualizar o vínculo.')
    } finally {
      setIsSavingLink(false)
    }
  }

  return (
    <section className="supplier-details" aria-labelledby="supplier-title">
      <Link className="back-link" to="/app/fornecedores">← Voltar para fornecedores</Link>
      <div className="client-details__heading">
        <div><span className="eyebrow">Fornecedor · {supplierStatusLabel(details.status)}</span><h1 id="supplier-title">{details.trade_name || details.legal_name}</h1><p>{details.trade_name ? details.legal_name : 'Cadastro de abastecimento'}</p></div>
        <div className="client-details__actions">
          <Link className="secondary-button secondary-button--link" to={`/app/fornecedores/${details.id}/editar`}>Editar fornecedor</Link>
          {!confirmArchive ? <button className="danger-text-button" type="button" onClick={() => setConfirmArchive(true)}>Arquivar</button> : (
            <div className="archive-confirm" role="alert"><span>Arquivar este fornecedor?</span><button type="button" onClick={() => void handleArchive()} disabled={isArchiving}>{isArchiving ? 'Arquivando…' : 'Sim, arquivar'}</button><button type="button" onClick={() => setConfirmArchive(false)} disabled={isArchiving}>Cancelar</button></div>
          )}
        </div>
      </div>
      <div className="action-messages" aria-live="polite">{(success || actionSuccess) && <div className="alert alert--success">{actionSuccess || success}</div>}{actionError && <div className="alert alert--error">{actionError}</div>}</div>
      <div className="supplier-detail-grid">
        <article className="info-card"><span className="eyebrow">Identificação</span><dl><div><dt>CPF/CNPJ</dt><dd>{details.tax_id || 'Não informado'}</dd></div><div><dt>Status</dt><dd>{supplierStatusLabel(details.status)}</dd></div></dl></article>
        <article className="info-card"><span className="eyebrow">Contato</span><dl><div><dt>Responsável</dt><dd>{details.contact_name || 'Não informado'}</dd></div><div><dt>Telefone</dt><dd>{details.phone || 'Não informado'}</dd></div><div><dt>E-mail</dt><dd>{details.email || 'Não informado'}</dd></div></dl></article>
        <article className="info-card"><span className="eyebrow">Endereço</span><p>{details.address || 'Nenhum endereço informado.'}</p></article>
        <article className="info-card"><span className="eyebrow">Observações</span><p>{details.notes || 'Nenhuma observação registrada.'}</p></article>
      </div>
      <SupplierInventoryLinkSection
        supplierId={details.id}
        supplierActive={details.status === 'active'}
        items={inventory.data}
        isSaving={isSavingLink}
        onLink={(itemId) => handleSupplierLink(itemId, details.id)}
        onUnlink={(itemId) => handleSupplierLink(itemId, null)}
      />
    </section>
  )
}
