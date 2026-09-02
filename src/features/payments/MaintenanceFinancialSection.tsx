import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PageState } from '../../components/PageState'
import { defaultPaidAt, formatPaymentCurrency, formatPaymentDate, formatPaymentDateTime } from './formatters'
import { cancelPayment, receivePayment } from './paymentApi'
import { paymentKeys, useMaintenancePayments } from './paymentQueries'
import { PaymentStatusBadge } from './PaymentStatusBadge'
import { getPaymentMethodLabel } from './types'
import { validatePaymentCancellation } from './validation'

type Props = {
  organizationId: string
  maintenanceId: string
  maintenanceStatus: string
}

export function MaintenanceFinancialSection({ organizationId, maintenanceId, maintenanceStatus }: Props) {
  const financial = useMaintenancePayments(organizationId, maintenanceId)
  const queryClient = useQueryClient()
  const [receiveId, setReceiveId] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [receivedAt, setReceivedAt] = useState(defaultPaidAt)
  const [cancelReason, setCancelReason] = useState('')
  const [isActing, setIsActing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: paymentKeys.all })
  }

  async function handleReceive(paymentId: string) {
    if (!receivedAt) {
      setActionError('Informe a data e hora do recebimento.')
      return
    }
    setIsActing(true)
    setActionError(null)
    try {
      await receivePayment(organizationId, paymentId, receivedAt)
      await refresh()
      setReceiveId(null)
      setActionSuccess('Pagamento confirmado e incluído no faturamento.')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível confirmar o recebimento.')
    } finally {
      setIsActing(false)
    }
  }

  async function handleCancel(paymentId: string) {
    const reasonError = validatePaymentCancellation(cancelReason)
    if (reasonError) {
      setActionError(reasonError)
      return
    }
    setIsActing(true)
    setActionError(null)
    try {
      await cancelPayment(organizationId, paymentId, cancelReason)
      await refresh()
      setCancelId(null)
      setCancelReason('')
      setActionSuccess('Pagamento cancelado com histórico preservado.')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível cancelar o pagamento.')
    } finally {
      setIsActing(false)
    }
  }

  if (financial.isLoading) {
    return <section className="maintenance-financial maintenance-financial--loading" aria-label="Carregando financeiro"><span /><span /><span /></section>
  }
  if (financial.isError || !financial.data?.summary) {
    return <section className="maintenance-financial"><PageState title="Resumo financeiro indisponível" description={financial.error?.message ?? 'Não foi possível calcular os pagamentos desta OS.'} actionLabel="Tentar novamente" onAction={() => void financial.refetch()} tone="error" /></section>
  }

  const { payments, summary } = financial.data
  const availableAmount = Number(summary.maintenance_total) - Number(summary.active_total)
  const canRegister = maintenanceStatus !== 'cancelled' && availableAmount > 0

  return (
    <section className="maintenance-financial" aria-labelledby="maintenance-financial-title">
      <div className="section-heading maintenance-financial__heading">
        <div><span className="eyebrow">Recebimentos reais</span><h2 id="maintenance-financial-title">Financeiro da OS</h2></div>
        {canRegister && <Link className="primary-button primary-button--link" to={`/app/manutencoes/${maintenanceId}/pagamentos/novo`}>Registrar pagamento <span aria-hidden="true">+</span></Link>}
      </div>

      <div className="payment-summary-grid">
        <article><span>Valor informado</span><strong>{formatPaymentCurrency(Number(summary.maintenance_total))}</strong><small>não é faturamento</small></article>
        <article className="is-received"><span>Total recebido</span><strong>{formatPaymentCurrency(Number(summary.received_total))}</strong><small>faturamento confirmado</small></article>
        <article><span>Saldo a receber</span><strong>{formatPaymentCurrency(Number(summary.balance_amount))}</strong><small>valor da OS menos recebidos</small></article>
        <article className="is-pending"><span>Pendente registrado</span><strong>{formatPaymentCurrency(Number(summary.pending_total))}</strong><small>compromete o limite da OS</small></article>
      </div>

      <div className="action-messages" aria-live="polite">
        {actionSuccess && <div className="alert alert--success">{actionSuccess}</div>}
        {actionError && <div className="alert alert--error">{actionError}</div>}
      </div>

      {payments.length === 0 ? (
        <PageState title="Nenhum pagamento registrado" description={maintenanceStatus === 'cancelled' ? 'Esta OS foi cancelada sem lançamentos financeiros.' : 'Registre um recebimento ou uma cobrança pendente para iniciar o histórico.'} />
      ) : (
        <div className="maintenance-payment-ledger">
          {payments.map((payment, index) => (
            <article key={payment.id} className={`maintenance-payment-entry maintenance-payment-entry--${payment.status}`}>
              <span className="maintenance-payment-entry__index">{String(index + 1).padStart(2, '0')}</span>
              <div className="maintenance-payment-entry__main">
                <div><strong>{formatPaymentCurrency(Number(payment.amount))}</strong><PaymentStatusBadge status={payment.status} /></div>
                <span>{getPaymentMethodLabel(payment.method)} · criado em {formatPaymentDateTime(payment.created_at)}</span>
                {payment.notes && <p>{payment.notes}</p>}
                {payment.status === 'received' && payment.paid_at && <small>Recebido em {formatPaymentDateTime(payment.paid_at)}</small>}
                {payment.status === 'pending' && payment.due_date && <small>Vencimento previsto: {formatPaymentDate(payment.due_date)}</small>}
                {payment.status === 'cancelled' && <small>Cancelado em {payment.cancelled_at ? formatPaymentDateTime(payment.cancelled_at) : '—'} · {payment.cancellation_reason}</small>}
              </div>
              {payment.status !== 'cancelled' && (
                <div className="maintenance-payment-entry__actions">
                  {payment.status === 'pending' && <button type="button" onClick={() => { setReceiveId(payment.id); setCancelId(null); setActionError(null); setReceivedAt(defaultPaidAt()) }}>Confirmar recebimento</button>}
                  <button className="danger-text-button" type="button" onClick={() => { setCancelId(payment.id); setReceiveId(null); setActionError(null); setCancelReason('') }}>Cancelar</button>
                </div>
              )}

              {receiveId === payment.id && (
                <div className="payment-inline-confirm" role="alert"><div><strong>Confirmar como recebido</strong><p>O valor passará a compor o faturamento pelo horário abaixo.</p></div><label className="field"><span>Recebido em</span><input type="datetime-local" value={receivedAt} max={defaultPaidAt()} onChange={(event) => setReceivedAt(event.target.value)} autoFocus /></label><div><button className="primary-button primary-button--compact" type="button" disabled={isActing} onClick={() => void handleReceive(payment.id)}>{isActing ? 'Confirmando…' : 'Confirmar'}</button><button className="secondary-button" type="button" disabled={isActing} onClick={() => setReceiveId(null)}>Voltar</button></div></div>
              )}
              {cancelId === payment.id && (
                <div className="payment-inline-confirm payment-inline-confirm--cancel" role="alert"><div><strong>Cancelar pagamento</strong><p>O lançamento continuará no histórico e deixará de ser ativo.</p></div><label className="field"><span>Motivo obrigatório</span><textarea rows={2} maxLength={500} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} autoFocus /></label><div><button className="danger-button" type="button" disabled={isActing} onClick={() => void handleCancel(payment.id)}>{isActing ? 'Cancelando…' : 'Confirmar cancelamento'}</button><button className="secondary-button" type="button" disabled={isActing} onClick={() => setCancelId(null)}>Voltar</button></div></div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
