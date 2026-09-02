import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { formatPaymentCurrency, formatPaymentDate, formatPaymentDateTime } from './formatters'
import { usePayments } from './paymentQueries'
import { PaymentStatusBadge } from './PaymentStatusBadge'
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  getPaymentMethodLabel,
  type PaymentFilters,
  type PaymentStatus,
} from './types'

const emptyFilters: PaymentFilters = {
  periodStart: '',
  periodEnd: '',
  clientId: '',
  method: '',
  status: '',
}

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>
}

export function FinancialListPage() {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<PaymentFilters>(emptyFilters)
  const { organization, payments, revenue, clients, deferredSearch } = usePayments(search, filters)
  const location = useLocation()
  const success = (location.state as { success?: string } | null)?.success
  const error = organization.error ?? payments.error ?? revenue.error ?? clients.error
  const isLoading = organization.isLoading || (
    organization.isSuccess && (payments.isLoading || revenue.isLoading || clients.isLoading)
  )
  const hasFilters = Boolean(search || Object.values(filters).some(Boolean))
  const totals = useMemo(() => {
    const byStatus: Record<PaymentStatus, number> = { pending: 0, received: 0, cancelled: 0 }
    let pendingAmount = 0
    for (const payment of payments.data ?? []) {
      byStatus[payment.status] += 1
      if (payment.status === 'pending') pendingAmount += Number(payment.amount)
    }
    return { byStatus, pendingAmount }
  }, [payments.data])

  return (
    <section className="financial-page" aria-labelledby="financial-title">
      <div className="module-heading">
        <div><span className="eyebrow">Livro-caixa por ordem de serviço</span><h1 id="financial-title">Financeiro</h1><p>Separe valor informado, cobranças pendentes e recebimentos que realmente compõem o faturamento.</p></div>
      </div>

      {success && <div className="alert alert--success" role="status">{success}</div>}

      <div className="financial-metrics" aria-label="Resumo financeiro do período">
        <article className="financial-metric financial-metric--received"><span>Faturamento recebido</span><strong>{formatPaymentCurrency(Number(revenue.data?.total_received ?? 0))}</strong><small>{revenue.data?.payment_count ?? 0} recebimentos por paid_at</small></article>
        <article><span>Pendente nos resultados</span><strong>{formatPaymentCurrency(totals.pendingAmount)}</strong><small>não contabilizado como faturamento</small></article>
        {PAYMENT_STATUSES.map((status) => <button key={status.value} type="button" className={filters.status === status.value ? 'is-selected' : ''} aria-pressed={filters.status === status.value} onClick={() => setFilters((current) => ({ ...current, status: current.status === status.value ? '' : status.value }))}><span>{status.label}</span><strong>{totals.byStatus[status.value]}</strong></button>)}
      </div>

      <div className="financial-toolbar">
        <label className="search-field financial-search" htmlFor="financial-search"><SearchIcon /><span className="sr-only">Buscar pagamentos</span><input id="financial-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por OS, cliente ou equipamento" autoComplete="off" />{search !== deferredSearch && <span className="search-field__busy" aria-label="Buscando" />}</label>
        <label className="financial-filter"><span>De</span><input type="date" value={filters.periodStart} onChange={(event) => setFilters((current) => ({ ...current, periodStart: event.target.value }))} /></label>
        <label className="financial-filter"><span>Até</span><input type="date" min={filters.periodStart || undefined} value={filters.periodEnd} onChange={(event) => setFilters((current) => ({ ...current, periodEnd: event.target.value }))} /></label>
        <label className="financial-filter"><span>Cliente</span><select value={filters.clientId} onChange={(event) => setFilters((current) => ({ ...current, clientId: event.target.value }))}><option value="">Todos</option>{clients.data?.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}</select></label>
        <label className="financial-filter"><span>Método</span><select value={filters.method} onChange={(event) => setFilters((current) => ({ ...current, method: event.target.value as PaymentFilters['method'] }))}><option value="">Todos</option>{PAYMENT_METHODS.map((method) => <option value={method.value} key={method.value}>{method.label}</option>)}</select></label>
        <label className="financial-filter"><span>Status</span><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as PaymentFilters['status'] }))}><option value="">Todos</option>{PAYMENT_STATUSES.map((status) => <option value={status.value} key={status.value}>{status.label}</option>)}</select></label>
        <button className="filter-clear" type="button" disabled={!hasFilters} onClick={() => { setSearch(''); setFilters(emptyFilters) }}>Limpar filtros</button>
      </div>

      {isLoading && <PageSkeleton rows={5} />}
      {!isLoading && error && <PageState title="Financeiro indisponível" description={error.message} actionLabel="Tentar novamente" onAction={() => { void payments.refetch(); void revenue.refetch(); void clients.refetch() }} tone="error" />}
      {!isLoading && !error && payments.data?.length === 0 && <PageState title={hasFilters ? 'Nenhum pagamento encontrado' : 'Nenhum pagamento registrado'} description={hasFilters ? 'Revise a busca, o período ou os filtros aplicados.' : 'Os pagamentos serão registrados a partir do detalhe de cada manutenção.'} />}

      {!isLoading && !error && Boolean(payments.data?.length) && (
        <div className="financial-ledger" aria-label="Histórico financeiro">
          <div className="financial-ledger__header" aria-hidden="true"><span>Referência</span><span>Cliente / OS</span><span>Método</span><span>Valor</span><span>Status</span></div>
          {payments.data?.map((payment, index) => (
            <Link to={`/app/manutencoes/${payment.maintenance_id}`} className="financial-row" key={payment.id} style={{ '--row-index': index } as React.CSSProperties}>
              <div><span className="financial-row__index">{String(index + 1).padStart(2, '0')}</span><div><strong>{payment.status === 'received' && payment.paid_at ? formatPaymentDateTime(payment.paid_at) : payment.due_date ? formatPaymentDate(payment.due_date) : formatPaymentDateTime(payment.created_at)}</strong><span>{payment.status === 'received' ? 'recebimento' : payment.status === 'pending' ? 'vencimento previsto' : 'registro cancelado'}</span></div></div>
              <div><strong>{payment.client_name}</strong><span>{payment.work_order_number} · {payment.equipment_name}</span></div>
              <div><strong>{getPaymentMethodLabel(payment.method)}</strong><span>{payment.notes || 'Sem observações'}</span></div>
              <div><strong>{formatPaymentCurrency(Number(payment.amount))}</strong><span>OS: {formatPaymentCurrency(Number(payment.maintenance_total))}</span></div>
              <PaymentStatusBadge status={payment.status} />
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
