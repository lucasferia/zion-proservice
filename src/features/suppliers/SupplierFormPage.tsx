import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { useActiveOrganization } from '../clients/clientQueries'
import { inventoryKeys } from '../inventory/inventoryQueries'
import { createSupplier, updateSupplier } from './supplierApi'
import { SupplierForm } from './SupplierForm'
import { supplierKeys, useSupplier } from './supplierQueries'
import { supplierToInput } from './types'

function Heading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className="form-page-heading"><Link className="back-link" to="/app/fornecedores">← Voltar para fornecedores</Link><span className="eyebrow">{eyebrow}</span><h1>{title}</h1></div>
}

export function CreateSupplierPage() {
  const organization = useActiveOrganization()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  if (organization.isLoading) return <PageSkeleton rows={5} />
  if (organization.isError) return <PageState title="Organização indisponível" description={organization.error.message} actionLabel="Tentar novamente" onAction={() => void organization.refetch()} tone="error" />
  return (
    <section className="form-page" aria-labelledby="create-supplier-title">
      <Heading eyebrow="Novo parceiro" title="Cadastrar fornecedor" /><span id="create-supplier-title" className="sr-only">Cadastrar fornecedor</span>
      <SupplierForm submitLabel="Cadastrar fornecedor" onSubmit={async (input) => {
        const id = await createSupplier(organization.data!, input)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: supplierKeys.lists() }),
          queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
        ])
        navigate(`/app/fornecedores/${id}`, { replace: true, state: { success: 'Fornecedor cadastrado com sucesso.' } })
      }} />
    </section>
  )
}

export function EditSupplierPage() {
  const { supplierId } = useParams()
  const { organization, supplier } = useSupplier(supplierId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const error = organization.error ?? supplier.error
  if (organization.isLoading || (organization.isSuccess && supplier.isLoading)) return <PageSkeleton rows={5} />
  if (error || !organization.data || !supplier.data) return <PageState title="Fornecedor indisponível" description={error?.message ?? 'O fornecedor não foi encontrado.'} actionLabel="Voltar" onAction={() => navigate('/app/fornecedores')} tone="error" />
  return (
    <section className="form-page" aria-labelledby="edit-supplier-title">
      <Heading eyebrow="Revisão do cadastro" title="Editar fornecedor" /><span id="edit-supplier-title" className="sr-only">Editar fornecedor</span>
      <SupplierForm initialValue={supplierToInput(supplier.data)} submitLabel="Salvar alterações" onSubmit={async (input) => {
        await updateSupplier(organization.data, supplier.data.id, input)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: supplierKeys.all }),
          queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
        ])
        navigate(`/app/fornecedores/${supplier.data.id}`, { replace: true, state: { success: 'Fornecedor atualizado com sucesso.' } })
      }} />
    </section>
  )
}
