import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { createEquipment, equipmentToInput, updateEquipment } from './equipmentApi'
import { EquipmentForm } from './EquipmentForm'
import {
  equipmentKeys,
  useEquipmentDetails,
  useEquipmentFormOptions,
} from './equipmentQueries'
import type { EquipmentInput } from './types'

function FormPageHeading({ title, eyebrow }: { title: string; eyebrow: string }) {
  return (
    <div className="form-page-heading">
      <Link className="back-link" to="/app/equipamentos">← Voltar para equipamentos</Link>
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
    </div>
  )
}

export function CreateEquipmentPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { organization, options } = useEquipmentFormOptions()
  const isLoading = organization.isLoading || (organization.isSuccess && options.isLoading)
  const error = organization.error ?? options.error

  if (isLoading) return <PageSkeleton rows={5} />
  if (error) {
    return (
      <PageState
        title="Não foi possível preparar o cadastro"
        description={error.message}
        actionLabel="Tentar novamente"
        onAction={() => void (organization.isError ? organization.refetch() : options.refetch())}
        tone="error"
      />
    )
  }
  if (!options.data) return null

  return (
    <section className="form-page" aria-labelledby="create-equipment-title">
      <FormPageHeading eyebrow="Novo ativo" title="Cadastrar equipamento" />
      <span id="create-equipment-title" className="sr-only">Cadastrar equipamento</span>
      <EquipmentForm
        options={options.data}
        submitLabel="Cadastrar equipamento"
        onSubmit={async (input) => {
          const id = await createEquipment(organization.data!, input)
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: equipmentKeys.lists() }),
            queryClient.invalidateQueries({ queryKey: equipmentKeys.options(organization.data!) }),
          ])
          navigate(`/app/equipamentos/${id}`, {
            replace: true,
            state: { success: 'Equipamento cadastrado com sucesso.' },
          })
        }}
      />
    </section>
  )
}

export function EditEquipmentPage() {
  const { equipmentId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const detailsQuery = useEquipmentDetails(equipmentId)
  const optionsQuery = useEquipmentFormOptions()
  const organization = detailsQuery.organization
  const isLoading = organization.isLoading
    || (organization.isSuccess && (detailsQuery.equipment.isLoading || optionsQuery.options.isLoading))
  const error = organization.error ?? detailsQuery.equipment.error ?? optionsQuery.options.error

  if (isLoading) return <PageSkeleton rows={5} />
  if (error || !detailsQuery.equipment.data || !optionsQuery.options.data) {
    return (
      <PageState
        title="Equipamento indisponível"
        description={error?.message ?? 'O equipamento não foi encontrado ou está arquivado.'}
        actionLabel="Tentar novamente"
        onAction={() => {
          if (organization.isError) void organization.refetch()
          if (detailsQuery.equipment.isError) void detailsQuery.equipment.refetch()
          if (optionsQuery.options.isError) void optionsQuery.options.refetch()
        }}
        tone="error"
      />
    )
  }

  const details = detailsQuery.equipment.data
  const options = optionsQuery.options.data

  return (
    <section className="form-page" aria-labelledby="edit-equipment-title">
      <FormPageHeading eyebrow="Revisão do ativo" title="Editar equipamento" />
      <span id="edit-equipment-title" className="sr-only">Editar equipamento</span>
      <EquipmentForm
        initialValue={equipmentToInput(details)}
        options={options}
        submitLabel="Salvar alterações"
        onSubmit={async (input: EquipmentInput) => {
          await updateEquipment(organization.data!, details.id, input)
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: equipmentKeys.lists() }),
            queryClient.invalidateQueries({ queryKey: equipmentKeys.detail(organization.data!, details.id) }),
            queryClient.invalidateQueries({ queryKey: equipmentKeys.options(organization.data!) }),
          ])
          navigate(`/app/equipamentos/${details.id}`, {
            replace: true,
            state: { success: 'Equipamento atualizado com sucesso.' },
          })
        }}
      />
    </section>
  )
}
