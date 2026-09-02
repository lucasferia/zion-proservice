import { useState } from 'react'
import { useParams } from 'react-router-dom'
import horizontalLogo from '../../../Imagens/Logo Horizontal.png'
import { PageSkeleton, PageState } from '../../components/PageState'
import { BUSINESS_TIMEZONE } from '../../lib/dateTime'
import { formatInventoryCurrency, formatInventoryQuantity } from '../inventory/formatters'
import { formatMaintenanceDate } from '../maintenances/formatters'
import { getMaintenanceStatusLabel, getMaintenanceTypeLabel } from '../maintenances/types'
import { formatPaymentCurrency, formatPaymentDate, formatPaymentDateTime } from '../payments/formatters'
import { getPaymentMethodLabel, getPaymentStatusLabel } from '../payments/types'
import { formatReturnDate } from '../returns/formatters'
import { getReturnStatusLabel } from '../returns/types'
import { PrintToolbar } from './PrintToolbar'
import { useMaintenancePrintRecord } from './printableQueries'
import type { MaintenancePrintRecord } from './types'

type DocumentProps = {
  record: MaintenancePrintRecord
  onPhotoSettled?: (photoId: string) => void
}

function issuedAt() {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: BUSINESS_TIMEZONE,
  }).format(new Date())
}

export function MaintenancePrintableDocument({ record, onPhotoSettled }: DocumentProps) {
  const { maintenance, payment_summary: summary } = record
  const receivedBalance = Math.max(0, Number(summary.maintenance_total) - Number(summary.received_total))
  const partsCost = maintenance.parts.reduce(
    (total, part) => total + Number(part.total_cost_snapshot ?? part.quantity * part.current_average_cost),
    0,
  )
  const before = record.photos.filter((photo) => photo.kind === 'before')
  const after = record.photos.filter((photo) => photo.kind === 'after')
  const partsLabel = maintenance.status === 'completed' ? 'Peças consumidas' : maintenance.status === 'cancelled' ? 'Planejamento não consumido' : 'Peças planejadas'

  return (
    <article className="print-document maintenance-print-document" aria-labelledby="maintenance-print-title">
      <header className="print-document__header">
        <div><img src={horizontalLogo} alt="ZION ProService" /><span>Ordem de serviço</span></div>
        <div><strong>{record.organization_name}</strong><span>Emitido em {issuedAt()}</span></div>
      </header>

      <section className="print-document__hero print-document__hero--maintenance">
        <div><span className="print-kicker">{getMaintenanceTypeLabel(maintenance.maintenance_type)}</span><h1 id="maintenance-print-title">{maintenance.work_order_number}</h1><p>{maintenance.client_name} · {maintenance.equipment_name}</p></div>
        <div className={`print-status print-status--${maintenance.status}`}><span>Status</span><strong>{getMaintenanceStatusLabel(maintenance.status)}</strong></div>
      </section>

      <section className="print-section" aria-labelledby="service-reference-title">
        <div className="print-section__heading"><span>01</span><h2 id="service-reference-title">Referência do atendimento</h2></div>
        <dl className="print-data-grid print-data-grid--service">
          <div><dt>Cliente</dt><dd>{maintenance.client_name}</dd></div>
          <div><dt>Unidade</dt><dd>{maintenance.location_name || 'Sem unidade específica'}</dd></div>
          <div><dt>Equipamento</dt><dd>{maintenance.equipment_name}</dd></div>
          <div><dt>Técnico responsável</dt><dd>{maintenance.technician_name}</dd></div>
          <div><dt>Atendimento</dt><dd>{formatMaintenanceDate(maintenance.scheduled_at)}</dd></div>
          <div><dt>Tipo</dt><dd>{getMaintenanceTypeLabel(maintenance.maintenance_type)}</dd></div>
          {maintenance.completed_at && <div><dt>Conclusão</dt><dd>{formatMaintenanceDate(maintenance.completed_at)}</dd></div>}
          {maintenance.cancelled_at && <div><dt>Cancelamento</dt><dd>{formatMaintenanceDate(maintenance.cancelled_at)}</dd></div>}
        </dl>
        {maintenance.status === 'cancelled' && <div className="print-note print-note--danger"><strong>Motivo do cancelamento</strong><p>{maintenance.cancellation_reason}</p></div>}
      </section>

      <section className="print-section" aria-labelledby="technical-report-title">
        <div className="print-section__heading"><span>02</span><h2 id="technical-report-title">Relatório técnico</h2></div>
        <div className="print-technical-grid">
          <article><h3>Diagnóstico</h3><p>{maintenance.diagnosis || 'Não informado.'}</p></article>
          <article><h3>Serviço realizado</h3><p>{maintenance.service_performed || 'Não informado.'}</p></article>
          <article><h3>Observações</h3><p>{maintenance.notes || 'Nenhuma observação registrada.'}</p></article>
        </div>
      </section>

      <section className="print-section" aria-labelledby="parts-report-title">
        <div className="print-section__heading"><span>03</span><h2 id="parts-report-title">{partsLabel}</h2><strong>{formatInventoryCurrency(partsCost)}</strong></div>
        {maintenance.parts.length === 0 ? <p className="print-empty">Nenhuma peça registrada nesta ordem de serviço.</p> : (
          <div className="print-table-wrap"><table className="print-table"><caption className="sr-only">Peças registradas na ordem de serviço</caption><thead><tr><th>Item</th><th>Quantidade</th><th>Custo unitário</th><th>Total</th></tr></thead><tbody>{maintenance.parts.map((part) => <tr key={part.id}><td><strong>{part.item_name}</strong><span>{part.item_sku || 'Sem SKU'}</span></td><td>{formatInventoryQuantity(part.quantity, part.unit_of_measure)}</td><td>{part.unit_cost_snapshot === null ? 'Não congelado' : formatInventoryCurrency(Number(part.unit_cost_snapshot))}</td><td>{part.total_cost_snapshot === null ? 'Não consumido' : formatInventoryCurrency(Number(part.total_cost_snapshot))}</td></tr>)}</tbody></table></div>
        )}
      </section>

      <section className="print-section" aria-labelledby="financial-report-title">
        <div className="print-section__heading"><span>04</span><h2 id="financial-report-title">Resumo financeiro</h2></div>
        <div className="print-financial-summary">
          <div><span>Valor da OS</span><strong>{formatPaymentCurrency(Number(summary.maintenance_total))}</strong></div>
          <div><span>Total recebido</span><strong>{formatPaymentCurrency(Number(summary.received_total))}</strong></div>
          <div><span>Pendente registrado</span><strong>{formatPaymentCurrency(Number(summary.pending_total))}</strong></div>
          <div><span>Saldo a receber</span><strong>{formatPaymentCurrency(receivedBalance)}</strong></div>
        </div>
        {record.payments.length === 0 ? <p className="print-empty">Nenhum pagamento registrado.</p> : (
          <div className="print-table-wrap"><table className="print-table"><caption className="sr-only">Histórico de pagamentos da ordem de serviço</caption><thead><tr><th>Método</th><th>Status</th><th>Referência</th><th>Valor</th></tr></thead><tbody>{record.payments.map((payment) => <tr key={payment.id} className={payment.status === 'cancelled' ? 'print-row-cancelled' : undefined}><td>{getPaymentMethodLabel(payment.method)}</td><td><strong>{getPaymentStatusLabel(payment.status)}</strong>{payment.cancellation_reason && <span>{payment.cancellation_reason}</span>}</td><td>{payment.paid_at ? `Recebido em ${formatPaymentDateTime(payment.paid_at)}` : payment.due_date ? `Vencimento ${formatPaymentDate(payment.due_date)}` : `Criado em ${formatPaymentDateTime(payment.created_at)}`}</td><td>{formatPaymentCurrency(Number(payment.amount))}</td></tr>)}</tbody></table></div>
        )}
      </section>

      <section className="print-section" aria-labelledby="return-report-title">
        <div className="print-section__heading"><span>05</span><h2 id="return-report-title">Retorno programado</h2></div>
        {record.scheduled_return ? (
          <div className="print-return-card"><div><span>Data</span><strong>{formatReturnDate(record.scheduled_return.scheduled_date)}</strong></div><div><span>Status</span><strong>{getReturnStatusLabel(record.scheduled_return.status)}</strong></div><p>{record.scheduled_return.notes || 'Sem orientação adicional.'}</p>{record.scheduled_return.cancellation_reason && <small>Motivo: {record.scheduled_return.cancellation_reason}</small>}</div>
        ) : maintenance.next_return_date ? (
          <div className="print-return-card">
            <div><span>Data prevista no relatório</span><strong>{formatReturnDate(maintenance.next_return_date)}</strong></div>
            <div><span>Status</span><strong>Aguardando conclusão da OS</strong></div>
            <p>O compromisso será criado na agenda quando esta manutenção for concluída.</p>
          </div>
        ) : <p className="print-empty">Nenhum retorno foi definido neste relatório.</p>}
      </section>

      <section className="print-section print-photo-section" aria-labelledby="photo-report-title">
        <div className="print-section__heading"><span>06</span><h2 id="photo-report-title">Registro fotográfico</h2><strong>{record.photos.length} foto(s)</strong></div>
        {record.photos.length === 0 ? <p className="print-empty">Nenhuma foto anexada.</p> : (
          <div className="print-photo-groups">
            {[{ label: 'Antes', photos: before }, { label: 'Depois', photos: after }].map((group) => (
              <section key={group.label} aria-label={`Fotos ${group.label}`}><h3>{group.label}</h3>{group.photos.length === 0 ? <p>Nenhuma foto.</p> : <div className="print-photo-grid">{group.photos.map((photo, index) => <figure key={photo.id}><img src={photo.signed_url} alt={`Foto ${group.label.toLowerCase()} ${index + 1} da manutenção`} onLoad={() => onPhotoSettled?.(photo.id)} onError={() => onPhotoSettled?.(photo.id)} /><figcaption>{group.label} · {String(index + 1).padStart(2, '0')}</figcaption></figure>)}</div>}</section>
            ))}
          </div>
        )}
      </section>

      <footer className="print-document__footer"><span>ZION ProService · {maintenance.work_order_number}</span><span>Documento operacional</span></footer>
    </article>
  )
}

export function MaintenancePrintPage() {
  const { maintenanceId } = useParams()
  const { organization, record } = useMaintenancePrintRecord(maintenanceId)
  const [settledPhotos, setSettledPhotos] = useState<Set<string>>(() => new Set())
  const loading = organization.isLoading || (organization.isSuccess && record.isLoading)
  const error = organization.error ?? record.error

  if (loading) return <PageSkeleton rows={8} />
  if (error || !record.data) {
    return <PageState title="Ordem de serviço indisponível" description={error?.message ?? 'A manutenção não foi encontrada.'} tone="error" />
  }

  const photosReady = settledPhotos.size >= record.data.photos.length
  return (
    <section className="print-page">
      <PrintToolbar backTo={`/app/manutencoes/${record.data.maintenance.id}`} backLabel="Voltar à manutenção" disabled={!photosReady} disabledHint="Preparando fotos privadas para impressão…" />
      <MaintenancePrintableDocument
        record={record.data}
        onPhotoSettled={(photoId) => setSettledPhotos((current) => new Set(current).add(photoId))}
      />
    </section>
  )
}
