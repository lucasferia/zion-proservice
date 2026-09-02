import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { useAuth } from '../auth/auth-context'
import { datePlusDays } from '../returns/formatters'
import { defaultScheduledAt } from './formatters'
import {
  createMaintenance,
  maintenanceToInput,
  updateMaintenance,
} from './maintenanceApi'
import { MaintenanceForm } from './MaintenanceForm'
import { MaintenancePhotoDraftHint, MaintenancePhotoSection } from './MaintenancePhotoSection'
import {
  maintenanceKeys,
  useMaintenanceDetails,
  useMaintenanceFormOptions,
} from './maintenanceQueries'
import { isMaintenanceOpen, type MaintenanceFormOptions, type MaintenanceInput } from './types'

function FormHeading({ title, eyebrow }: { title: string; eyebrow: string }) {
  return (
    <div className="form-page-heading">
      <Link className="back-link" to="/app/manutencoes">← Voltar para manutenções</Link>
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
    </div>
  )
}

function createInitialInput(
  options: MaintenanceFormOptions,
  currentUserId: string,
  preselectedEquipmentId: string,
): MaintenanceInput {
  const equipment = options.equipment.find((item) => item.id === preselectedEquipmentId)
  return {
    client_id: '',
    client_location_id: '',
    equipment_id: equipment?.id ?? '',
    maintenance_type: 'preventive',
    status: 'draft',
    scheduled_at: defaultScheduledAt(),
    next_return_date: datePlusDays(30),
    diagnosis: '',
    service_performed: '',
    notes: '',
    responsible_technician_id: options.technicians.some((item) => item.user_id === currentUserId)
      ? currentUserId
      : options.technicians[0]?.user_id ?? '',
    total_amount: '0',
  }
}

export function CreateMaintenancePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const { session } = useAuth()
  const { organization, options } = useMaintenanceFormOptions()
  const isLoading = organization.isLoading || (organization.isSuccess && options.isLoading)
  const error = organization.error ?? options.error

  if (isLoading) return <PageSkeleton rows={6} />
  if (error || !options.data) {
    return <PageState title="Não foi possível preparar a nova OS" description={error?.message ?? 'Dados de apoio indisponíveis.'} actionLabel="Tentar novamente" onAction={() => void (organization.isError ? organization.refetch() : options.refetch())} tone="error" />
  }
  if (!options.data.equipment.length) {
    return <PageState title="Cadastre um equipamento primeiro" description="Toda manutenção precisa estar vinculada a um equipamento ativo." actionLabel="Ir para equipamentos" onAction={() => navigate('/app/equipamentos')} />
  }

  const initialValue = createInitialInput(
    options.data,
    session?.user.id ?? '',
    searchParams.get('equipmentId') ?? '',
  )

  return (
    <section className="form-page maintenance-form-page" aria-labelledby="create-maintenance-title">
      <FormHeading eyebrow="Nova ordem de serviço" title="Registrar manutenção" />
      <span id="create-maintenance-title" className="sr-only">Registrar manutenção</span>
      <MaintenanceForm
        options={options.data}
        initialValue={initialValue}
        submitLabel="Criar rascunho da OS"
        onSubmit={async (input) => {
          const id = await createMaintenance(organization.data!, input)
          await queryClient.invalidateQueries({ queryKey: maintenanceKeys.all })
          navigate(`/app/manutencoes/${id}`, {
            replace: true,
            state: { success: 'OS criada. Agora você pode adicionar as peças previstas.' },
          })
        }}
      />
      <MaintenancePhotoDraftHint />
    </section>
  )
}

export function EditMaintenancePage() {
  const { maintenanceId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const detailsQuery = useMaintenanceDetails(maintenanceId)
  const optionsQuery = useMaintenanceFormOptions()
  const organization = detailsQuery.organization
  const isLoading = organization.isLoading || (
    organization.isSuccess
    && (detailsQuery.maintenance.isLoading || optionsQuery.options.isLoading)
  )
  const error = organization.error ?? detailsQuery.maintenance.error ?? optionsQuery.options.error

  if (isLoading) return <PageSkeleton rows={6} />
  if (error || !detailsQuery.maintenance.data || !optionsQuery.options.data) {
    return <PageState title="OS indisponível" description={error?.message ?? 'A manutenção não foi encontrada.'} actionLabel="Tentar novamente" onAction={() => { void detailsQuery.maintenance.refetch(); void optionsQuery.options.refetch() }} tone="error" />
  }

  const details = detailsQuery.maintenance.data
  if (!isMaintenanceOpen(details.status)) {
    return <PageState title="Esta OS faz parte do histórico" description="Manutenções concluídas ou canceladas não podem ser editadas." actionLabel="Voltar ao detalhe" onAction={() => navigate(`/app/manutencoes/${details.id}`)} />
  }

  const options = optionsQuery.options.data
  const compatibleOptions: MaintenanceFormOptions = {
    ...options,
    clients: options.clients.some((item) => item.id === details.client_id)
      ? options.clients
      : [{ id: details.client_id, name: `${details.client_name} (arquivado)` }, ...options.clients],
    equipment: options.equipment.some((item) => item.id === details.equipment_id)
      ? options.equipment
      : [{ id: details.equipment_id, name: `${details.equipment_name} (arquivado)`, category: 'Histórico', status: 'inactive' }, ...options.equipment],
  }

  return (
    <section className="form-page maintenance-form-page" aria-labelledby="edit-maintenance-title">
      <FormHeading eyebrow={details.work_order_number} title="Editar manutenção" />
      <span id="edit-maintenance-title" className="sr-only">Editar manutenção</span>
      <MaintenanceForm
        options={compatibleOptions}
        initialValue={maintenanceToInput(details)}
        isEditing
        submitLabel="Salvar alterações"
        onSubmit={async (input) => {
          await updateMaintenance(organization.data!, details.id, input)
          await queryClient.invalidateQueries({ queryKey: maintenanceKeys.all })
          navigate(`/app/manutencoes/${details.id}`, {
            replace: true,
            state: { success: 'Ordem de serviço atualizada com sucesso.' },
          })
        }}
      />
      <MaintenancePhotoSection
        organizationId={organization.data!}
        maintenanceId={details.id}
        status={details.status}
      />
    </section>
  )
}
