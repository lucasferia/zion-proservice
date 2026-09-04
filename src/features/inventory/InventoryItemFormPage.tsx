import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import {
  createInventoryItem,
  inventoryItemToInput,
  updateInventoryItem,
} from './inventoryApi'
import { InventoryItemForm } from './InventoryItemForm'
import {
  inventoryKeys,
  useInventoryItemDetails,
  useInventoryOptions,
} from './inventoryQueries'

function FormPageHeading({ title, eyebrow }: { title: string; eyebrow: string }) {
  return (
    <div className="form-page-heading">
      <Link className="back-link" to="/app/estoque">← Voltar para estoque</Link>
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
    </div>
  )
}

export function CreateInventoryItemPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const { organization, options } = useInventoryOptions()
  const isLoading = organization.isLoading || (organization.isSuccess && options.isLoading)
  const error = organization.error ?? options.error

  if (isLoading) return <PageSkeleton rows={5} />
  if (error) {
    return <PageState title="Não foi possível preparar o cadastro" description={error.message} actionLabel="Tentar novamente" onAction={() => void (organization.isError ? organization.refetch() : options.refetch())} tone="error" />
  }

  return (
    <section className="form-page" aria-labelledby="create-inventory-title">
      <FormPageHeading eyebrow="Novo insumo" title="Cadastrar item" />
      <span id="create-inventory-title" className="sr-only">Cadastrar item de estoque</span>
      <InventoryItemForm
        options={options.data!}
        initialSupplierId={options.data!.suppliers.some((supplier) => supplier.id === searchParams.get('fornecedor')) ? searchParams.get('fornecedor')! : undefined}
        submitLabel="Cadastrar item"
        onSubmit={async (input) => {
          const id = await createInventoryItem(organization.data!, input)
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() }),
            queryClient.invalidateQueries({ queryKey: inventoryKeys.options(organization.data!) }),
          ])
          navigate(`/app/estoque/${id}`, {
            replace: true,
            state: { success: 'Item cadastrado com sucesso. Registre uma entrada para criar saldo.' },
          })
        }}
      />
    </section>
  )
}

export function EditInventoryItemPage() {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const detailsQuery = useInventoryItemDetails(itemId)
  const optionsQuery = useInventoryOptions()
  const organization = detailsQuery.organization
  const isLoading = organization.isLoading
    || (organization.isSuccess && (detailsQuery.item.isLoading || optionsQuery.options.isLoading))
  const error = organization.error ?? detailsQuery.item.error ?? optionsQuery.options.error

  if (isLoading) return <PageSkeleton rows={5} />
  if (error || !detailsQuery.item.data || !optionsQuery.options.data) {
    return <PageState title="Item indisponível" description={error?.message ?? 'O item não foi encontrado ou está arquivado.'} actionLabel="Tentar novamente" onAction={() => {
      if (organization.isError) void organization.refetch()
      if (detailsQuery.item.isError) void detailsQuery.item.refetch()
      if (optionsQuery.options.isError) void optionsQuery.options.refetch()
    }} tone="error" />
  }

  const item = detailsQuery.item.data
  const formOptions = item.supplier && !optionsQuery.options.data.suppliers.some((supplier) => supplier.id === item.supplier!.id)
    ? {
        ...optionsQuery.options.data,
        suppliers: [{ id: item.supplier.id, name: `${item.supplier.name} (arquivado)` }, ...optionsQuery.options.data.suppliers],
      }
    : optionsQuery.options.data
  return (
    <section className="form-page" aria-labelledby="edit-inventory-title">
      <FormPageHeading eyebrow="Revisão do cadastro" title="Editar item" />
      <span id="edit-inventory-title" className="sr-only">Editar item de estoque</span>
      <InventoryItemForm
        options={formOptions}
        initialValue={inventoryItemToInput(item)}
        submitLabel="Salvar alterações"
        onSubmit={async (input) => {
          await updateInventoryItem(organization.data!, item.id, input)
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() }),
            queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(organization.data!, item.id) }),
            queryClient.invalidateQueries({ queryKey: inventoryKeys.options(organization.data!) }),
          ])
          navigate(`/app/estoque/${item.id}`, {
            replace: true,
            state: { success: 'Item atualizado com sucesso.' },
          })
        }}
      />
    </section>
  )
}
