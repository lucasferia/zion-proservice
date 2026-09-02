import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { recordInventoryMovement } from './inventoryApi'
import { InventoryMovementForm } from './InventoryMovementForm'
import { inventoryKeys, useInventoryItemDetails } from './inventoryQueries'

export function InventoryMovementPage() {
  const { itemId } = useParams()
  const { organization, item } = useInventoryItemDetails(itemId)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const isLoading = organization.isLoading || (organization.isSuccess && item.isLoading)
  const error = organization.error ?? item.error

  if (isLoading) return <PageSkeleton rows={5} />
  if (error || !item.data) {
    return <PageState title="Item indisponível" description={error?.message ?? 'O item não foi encontrado ou está arquivado.'} actionLabel="Tentar novamente" onAction={() => void (organization.isError ? organization.refetch() : item.refetch())} tone="error" />
  }
  if (item.data.status === 'inactive') {
    return <PageState title="Item inativo" description="Reative o item no cadastro antes de registrar uma movimentação." actionLabel="Editar item" onAction={() => navigate(`/app/estoque/${item.data.id}/editar`)} />
  }

  return (
    <section className="form-page movement-page" aria-labelledby="movement-title">
      <div className="form-page-heading">
        <Link className="back-link" to={`/app/estoque/${item.data.id}`}>← Voltar para o item</Link>
        <span className="eyebrow">Movimentação rastreável</span>
        <h1 id="movement-title">Movimentar estoque</h1>
        <p className="movement-page__item">{item.data.name} · {item.data.sku || 'Sem SKU'}</p>
      </div>
      <InventoryMovementForm
        item={item.data}
        onSubmit={async (input) => {
          await recordInventoryMovement(organization.data!, item.data.id, input)
          await queryClient.invalidateQueries({ queryKey: inventoryKeys.all })
          navigate(`/app/estoque/${item.data.id}`, {
            replace: true,
            state: { success: 'Movimentação registrada e saldo atualizado com sucesso.' },
          })
        }}
      />
    </section>
  )
}
