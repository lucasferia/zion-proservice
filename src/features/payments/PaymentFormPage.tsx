import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { maintenanceKeys, useMaintenanceDetails } from '../maintenances/maintenanceQueries'
import { createPayment } from './paymentApi'
import { paymentKeys, useMaintenancePayments } from './paymentQueries'
import { PaymentForm } from './PaymentForm'

export function CreatePaymentPage() {
  const { maintenanceId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const detailsQuery = useMaintenanceDetails(maintenanceId)
  const organizationId = detailsQuery.organization.data ?? ''
  const financial = useMaintenancePayments(organizationId, maintenanceId ?? '')
  const isLoading = detailsQuery.organization.isLoading || detailsQuery.maintenance.isLoading || financial.isLoading
  const error = detailsQuery.organization.error ?? detailsQuery.maintenance.error ?? financial.error

  if (isLoading) return <PageSkeleton rows={5} />
  if (error || !detailsQuery.maintenance.data || !financial.data?.summary) {
    return <PageState title="Pagamento indisponível" description={error?.message ?? 'Não foi possível carregar o resumo financeiro desta OS.'} actionLabel="Tentar novamente" onAction={() => { void detailsQuery.maintenance.refetch(); void financial.refetch() }} tone="error" />
  }

  const maintenance = detailsQuery.maintenance.data
  const availableAmount = Number(financial.data.summary.maintenance_total) - Number(financial.data.summary.active_total)
  if (maintenance.status === 'cancelled') {
    return <PageState title="OS cancelada" description="Não é possível registrar novos pagamentos em uma manutenção cancelada." actionLabel="Voltar ao detalhe" onAction={() => navigate(`/app/manutencoes/${maintenance.id}`)} />
  }
  if (availableAmount <= 0) {
    return <PageState title="Valor totalmente comprometido" description="Os pagamentos ativos já atingiram o valor informado da OS." actionLabel="Voltar ao detalhe" onAction={() => navigate(`/app/manutencoes/${maintenance.id}`)} />
  }

  return (
    <section className="form-page payment-form-page" aria-labelledby="create-payment-title">
      <div className="form-page-heading"><Link className="back-link" to={`/app/manutencoes/${maintenance.id}`}>← Voltar para a OS</Link><span className="eyebrow">Recebimento rastreável</span><h1 id="create-payment-title">Registrar pagamento</h1></div>
      <PaymentForm
        availableAmount={availableAmount}
        workOrderNumber={maintenance.work_order_number}
        clientName={maintenance.client_name}
        onSubmit={async (input) => {
          await createPayment(organizationId, maintenance.client_id, maintenance.id, input)
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: paymentKeys.all }),
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.detail(organizationId, maintenance.id) }),
          ])
          navigate(`/app/manutencoes/${maintenance.id}`, { replace: true, state: { success: input.status === 'received' ? 'Recebimento registrado e incluído no faturamento.' : 'Pagamento pendente registrado sem alterar o faturamento.' } })
        }}
      />
    </section>
  )
}
