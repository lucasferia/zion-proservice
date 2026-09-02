import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { formatInventoryQuantity } from '../inventory/formatters'
import { getMaintenanceTypeLabel } from '../maintenances/types'
import { useOperationalDashboard } from './dashboardQueries'
import {
  dateInSaoPaulo,
  defaultDashboardPeriod,
  formatDashboardCurrency,
  formatDashboardDate,
  formatDashboardDateTime,
  formatPeriodLabel,
  formatReturnDistance,
} from './formatters'
import type { DashboardPeriod, OperationalDashboard } from './types'

type ContentProps = {
  data: OperationalDashboard
}

function CountPill({ value, tone = 'default' }: { value: number; tone?: 'default' | 'warning' | 'danger' | 'success' }) {
  return <span className={`dashboard-count dashboard-count--${tone}`}>{value}</span>
}

function EmptyPriority({ children }: { children: ReactNode }) {
  return <div className="dashboard-priority-empty"><span aria-hidden="true">✓</span><p>{children}</p></div>
}

export function DashboardContent({ data }: ContentProps) {
  const stockRisk = data.inventory_attention + data.inventory_critical + data.inventory_out_of_stock
  const activePriorities = data.priority_returns.length + data.priority_maintenances.length + data.priority_inventory.length

  if (data.is_new_organization) {
    return (
      <section className="dashboard-new-organization" aria-labelledby="dashboard-empty-title">
        <div className="dashboard-new-organization__index" aria-hidden="true">00</div>
        <div>
          <span className="eyebrow">Organização pronta para começar</span>
          <h2 id="dashboard-empty-title">Os indicadores estão zerados porque ainda não há operação registrada.</h2>
          <p>Cadastre o primeiro cliente, vincule seus equipamentos e abra uma ordem de serviço. Faturamento, retornos e estoque aparecerão automaticamente conforme o trabalho for registrado.</p>
          <div className="dashboard-onboarding-actions">
            <Link className="primary-button primary-button--compact primary-button--link" to="/app/clientes/novo">Cadastrar cliente</Link>
            <Link className="secondary-button secondary-button--link" to="/app/estoque/novo">Cadastrar item de estoque</Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="dashboard-metrics" aria-label="Indicadores do período">
        <Link to="/app/manutencoes" className="dashboard-metric dashboard-metric--primary">
          <span className="dashboard-metric__coordinate">M.01</span>
          <span>Manutenções concluídas</span>
          <strong>{data.completed_maintenances}</strong>
          <small>no período selecionado</small>
        </Link>
        <Link to="/app/manutencoes" className="dashboard-metric">
          <span className="dashboard-metric__coordinate">M.02</span>
          <span>OS em andamento</span>
          <strong>{data.in_progress_maintenances}</strong>
          <small>agendadas no período</small>
        </Link>
        <Link to="/app/clientes" className="dashboard-metric">
          <span className="dashboard-metric__coordinate">C.01</span>
          <span>Clientes ativos</span>
          <strong>{data.active_clients}</strong>
          <small>cadastros não arquivados</small>
        </Link>
        <Link to="/app/financeiro" className="dashboard-metric dashboard-metric--revenue">
          <span className="dashboard-metric__coordinate">F.01</span>
          <span>Faturamento recebido</span>
          <strong>{formatDashboardCurrency(data.received_revenue)}</strong>
          <small>somente received por paid_at</small>
        </Link>
      </section>

      <section className="dashboard-pulse" aria-labelledby="operational-pulse-title">
        <div className="dashboard-section-heading">
          <div><span className="eyebrow">Visão atual · sem filtro de período</span><h2 id="operational-pulse-title">Pulso operacional</h2></div>
          <span className="dashboard-priority-total"><strong>{activePriorities}</strong> prioridades visíveis</span>
        </div>
        <div className="dashboard-pulse__grid">
          <Link to="/app/agenda" className="dashboard-pulse-group dashboard-pulse-group--returns">
            <div><span>Retornos</span><strong>{data.overdue_returns + data.today_returns + data.next_7_returns}</strong></div>
            <dl><div><dt>Vencidos</dt><dd><CountPill value={data.overdue_returns} tone={data.overdue_returns ? 'danger' : 'default'} /></dd></div><div><dt>Hoje</dt><dd><CountPill value={data.today_returns} tone={data.today_returns ? 'warning' : 'default'} /></dd></div><div><dt>7 dias</dt><dd><CountPill value={data.next_7_returns} /></dd></div></dl>
          </Link>
          <Link to="/app/estoque" className="dashboard-pulse-group dashboard-pulse-group--inventory">
            <div><span>Estoque em atenção</span><strong>{stockRisk}</strong></div>
            <dl><div><dt>Atenção</dt><dd><CountPill value={data.inventory_attention} tone={data.inventory_attention ? 'warning' : 'default'} /></dd></div><div><dt>Crítico</dt><dd><CountPill value={data.inventory_critical} tone={data.inventory_critical ? 'danger' : 'default'} /></dd></div><div><dt>Sem saldo</dt><dd><CountPill value={data.inventory_out_of_stock} tone={data.inventory_out_of_stock ? 'danger' : 'default'} /></dd></div></dl>
          </Link>
        </div>
      </section>

      <section className="dashboard-priorities" aria-labelledby="today-priorities-title">
        <div className="dashboard-section-heading"><div><span className="eyebrow">Fila de despacho</span><h2 id="today-priorities-title">Prioridades de hoje</h2></div><span className="dashboard-live-indicator"><span aria-hidden="true" /> Operação atual</span></div>
        <div className="dashboard-priority-grid">
          <article className="dashboard-priority-panel dashboard-priority-panel--returns">
            <header><div><span className="dashboard-panel-code">R / HOJE</span><h3>Retornos vencidos e de hoje</h3></div><Link to="/app/agenda">Abrir agenda</Link></header>
            {data.priority_returns.length === 0 ? <EmptyPriority>Nenhum retorno vencido ou previsto para hoje.</EmptyPriority> : <div className="dashboard-priority-list">{data.priority_returns.map((item) => <Link to="/app/agenda" key={item.id}><span className={`dashboard-priority-mark dashboard-priority-mark--${item.timing}`} aria-hidden="true" /><div><strong>{item.client_name}</strong><span>{item.equipment_name} · {item.location_name || 'Sem unidade específica'}</span></div><div className="dashboard-priority-time"><strong>{item.timing === 'today' ? 'Hoje' : `${item.days_overdue}d`}</strong><span>{formatDashboardDate(item.scheduled_date)}</span></div></Link>)}</div>}
          </article>

          <article className="dashboard-priority-panel dashboard-priority-panel--maintenance">
            <header><div><span className="dashboard-panel-code">OS / ATIVA</span><h3>Ordens em andamento</h3></div><Link to="/app/manutencoes">Ver todas</Link></header>
            {data.priority_maintenances.length === 0 ? <EmptyPriority>Nenhuma ordem de serviço está em andamento.</EmptyPriority> : <div className="dashboard-priority-list">{data.priority_maintenances.map((item) => <Link to={`/app/manutencoes/${item.id}`} key={item.id}><span className="dashboard-priority-mark dashboard-priority-mark--progress" aria-hidden="true" /><div><strong>{item.work_order_number}</strong><span>{item.client_name} · {item.equipment_name}</span></div><div className="dashboard-priority-time"><strong>{getMaintenanceTypeLabel(item.maintenance_type)}</strong><span>{formatDashboardDateTime(item.scheduled_at)}</span></div></Link>)}</div>}
          </article>

          <article className="dashboard-priority-panel dashboard-priority-panel--stock">
            <header><div><span className="dashboard-panel-code">ST / CRÍTICO</span><h3>Estoque crítico</h3></div><Link to="/app/estoque">Abrir estoque</Link></header>
            {data.priority_inventory.length === 0 ? <EmptyPriority>Nenhum item está crítico ou sem saldo.</EmptyPriority> : <div className="dashboard-priority-list">{data.priority_inventory.map((item) => <Link to={`/app/estoque/${item.id}`} key={item.id}><span className={`dashboard-priority-mark dashboard-priority-mark--${item.situation}`} aria-hidden="true" /><div><strong>{item.name}</strong><span>{item.sku || 'Sem SKU'} · mínimo {formatInventoryQuantity(item.minimum_stock, item.unit_of_measure)}</span></div><div className="dashboard-priority-time"><strong>{formatInventoryQuantity(item.current_quantity, item.unit_of_measure)}</strong><span>{item.situation === 'out_of_stock' ? 'sem saldo' : 'crítico'}</span></div></Link>)}</div>}
          </article>
        </div>
      </section>

      <section className="dashboard-briefing" aria-label="Resumo recente e próximos compromissos">
        <article className="dashboard-briefing-panel">
          <header><div><span className="eyebrow">Histórico do período</span><h2>Últimas concluídas</h2></div><Link to="/app/manutencoes">Ver manutenções</Link></header>
          {data.latest_completed_maintenances.length === 0 ? <div className="dashboard-list-empty"><p>Nenhuma manutenção foi concluída no período selecionado.</p></div> : <ol>{data.latest_completed_maintenances.map((item, index) => <li key={item.id}><span>{String(index + 1).padStart(2, '0')}</span><Link to={`/app/manutencoes/${item.id}`}><strong>{item.work_order_number}</strong><small>{item.client_name} · {item.equipment_name}</small></Link><div><strong>{formatDashboardCurrency(item.total_amount)}</strong><small>{formatDashboardDateTime(item.completed_at)}</small></div></li>)}</ol>}
        </article>
        <article className="dashboard-briefing-panel">
          <header><div><span className="eyebrow">Agenda atual</span><h2>Próximos retornos</h2></div><Link to="/app/agenda">Ver agenda</Link></header>
          {data.upcoming_returns.length === 0 ? <div className="dashboard-list-empty"><p>Nenhum retorno futuro está pendente.</p></div> : <ol>{data.upcoming_returns.map((item, index) => <li key={item.id}><span>{String(index + 1).padStart(2, '0')}</span><Link to="/app/agenda"><strong>{item.client_name}</strong><small>{item.equipment_name} · {item.location_name || 'Sem unidade específica'}</small></Link><div><strong>{formatReturnDistance(item.days_until)}</strong><small>{formatDashboardDate(item.scheduled_date)}</small></div></li>)}</ol>}
        </article>
      </section>
    </>
  )
}

export function DashboardPage() {
  const initialPeriod = defaultDashboardPeriod()
  const [period, setPeriod] = useState<DashboardPeriod>(initialPeriod)
  const [draftPeriod, setDraftPeriod] = useState<DashboardPeriod>(initialPeriod)
  const [periodError, setPeriodError] = useState<string | null>(null)
  const { organization, dashboard } = useOperationalDashboard(period)
  const error = organization.error ?? dashboard.error
  const loading = organization.isLoading || (organization.isSuccess && dashboard.isLoading)

  function applyPeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draftPeriod.start || !draftPeriod.end) {
      setPeriodError('Informe o início e o fim do período.')
      return
    }
    if (draftPeriod.start > draftPeriod.end) {
      setPeriodError('O início do período não pode ser posterior ao fim.')
      return
    }
    setPeriodError(null)
    setPeriod(draftPeriod)
  }

  function restoreCurrentMonth() {
    const current = defaultDashboardPeriod()
    setDraftPeriod(current)
    setPeriod(current)
    setPeriodError(null)
  }

  return (
    <section className="dashboard-page" aria-labelledby="dashboard-title">
      <div className="dashboard-heading">
        <div><span className="eyebrow">Central de comando · {dateInSaoPaulo().split('-').reverse().join('/')}</span><h1 id="dashboard-title">Operação agora</h1><p>Decisões rápidas sobre serviços, retornos, recebimentos e peças que pedem atenção.</p></div>
        <form className="dashboard-period" onSubmit={applyPeriod} aria-label="Filtrar indicadores por período">
          <div><span className="eyebrow">Período dos indicadores</span><strong>{formatPeriodLabel(period)}</strong></div>
          <label><span>De</span><input type="date" value={draftPeriod.start} onChange={(event) => setDraftPeriod((current) => ({ ...current, start: event.target.value }))} aria-invalid={Boolean(periodError)} /></label>
          <label><span>Até</span><input type="date" value={draftPeriod.end} onChange={(event) => setDraftPeriod((current) => ({ ...current, end: event.target.value }))} aria-invalid={Boolean(periodError)} /></label>
          <button className="primary-button primary-button--compact" type="submit" disabled={dashboard.isFetching}>Aplicar</button>
          <button className="dashboard-period__reset" type="button" onClick={restoreCurrentMonth}>Mês atual</button>
          {periodError && <span className="field-error" role="alert">{periodError}</span>}
        </form>
      </div>

      {loading && <PageSkeleton rows={7} />}
      {!loading && error && <PageState title="Dashboard indisponível" description={error.message} actionLabel="Tentar novamente" onAction={() => void dashboard.refetch()} tone="error" />}
      {!loading && !error && dashboard.data && <DashboardContent data={dashboard.data} />}
    </section>
  )
}
