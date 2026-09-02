import { Link, useParams } from 'react-router-dom'
import horizontalLogo from '../../../Imagens/Logo Horizontal.png'
import { PageSkeleton, PageState } from '../../components/PageState'
import { BUSINESS_TIMEZONE } from '../../lib/dateTime'
import type { ClientLocation } from '../clients/types'
import { getEquipmentStatusLabel } from '../equipment/types'
import { PrintToolbar } from './PrintToolbar'
import { useClientPrintRecord } from './printableQueries'
import type { ClientPrintRecord } from './types'

function formatAddress(location: ClientLocation) {
  const line = [location.street, location.number].filter(Boolean).join(', ')
  const district = [location.neighborhood, `${location.city}/${location.state}`].filter(Boolean).join(' · ')
  return [line, location.complement, district, location.postal_code ? `CEP ${location.postal_code}` : null]
    .filter(Boolean)
    .join(' — ')
}

function issuedAt() {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: BUSINESS_TIMEZONE,
  }).format(new Date())
}

export function ClientPrintableDocument({ record }: { record: ClientPrintRecord }) {
  const { client, equipment } = record
  const locations = new Map(client.client_locations.map((location) => [location.id, location.name]))

  return (
    <article className="print-document client-print-document" aria-labelledby="client-print-title">
      <header className="print-document__header">
        <div><img src={horizontalLogo} alt="ZION ProService" /><span>Ficha cadastral</span></div>
        <div><strong>{record.organization_name}</strong><span>Emitido em {issuedAt()}</span></div>
      </header>

      <section className="print-document__hero">
        <div><span className="print-kicker">Cliente</span><h1 id="client-print-title">{client.name}</h1><p>Cadastro operacional e parque de equipamentos vinculados.</p></div>
        <span className="print-document__code">CLI<br />{client.id.slice(0, 8).toUpperCase()}</span>
      </section>

      <section className="print-section" aria-labelledby="client-data-title">
        <div className="print-section__heading"><span>01</span><h2 id="client-data-title">Dados cadastrais</h2></div>
        <dl className="print-data-grid">
          <div><dt>Telefone</dt><dd>{client.phone || 'Não informado'}</dd></div>
          <div><dt>E-mail</dt><dd>{client.email || 'Não informado'}</dd></div>
          <div><dt>Documento</dt><dd>{client.document || 'Não informado'}</dd></div>
          <div><dt>Cadastrado em</dt><dd>{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: BUSINESS_TIMEZONE }).format(new Date(client.created_at))}</dd></div>
        </dl>
        <div className="print-note"><strong>Observações</strong><p>{client.notes || 'Nenhuma observação registrada.'}</p></div>
      </section>

      <section className="print-section" aria-labelledby="client-locations-title">
        <div className="print-section__heading"><span>02</span><h2 id="client-locations-title">Unidades e endereços</h2></div>
        {client.client_locations.length === 0 ? (
          <p className="print-empty">Nenhuma unidade ativa cadastrada.</p>
        ) : (
          <div className="print-location-list">
            {client.client_locations.map((location, index) => (
              <article key={location.id}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div><h3>{location.name}</h3><p>{formatAddress(location)}</p>{location.notes && <small>{location.notes}</small>}</div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="print-section" aria-labelledby="client-equipment-title">
        <div className="print-section__heading"><span>03</span><h2 id="client-equipment-title">Equipamentos vinculados</h2></div>
        {equipment.length === 0 ? (
          <p className="print-empty">Nenhum equipamento ativo vinculado ao cliente.</p>
        ) : (
          <div className="print-table-wrap">
            <table className="print-table">
              <caption className="sr-only">Equipamentos vinculados ao cliente</caption>
              <thead><tr><th>Equipamento</th><th>Unidade</th><th>Identificação</th><th>Status</th></tr></thead>
              <tbody>{equipment.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong><span>{item.category} · {[item.brand, item.model].filter(Boolean).join(' ') || 'Marca/modelo não informados'}</span></td>
                  <td>{item.client_location_id ? locations.get(item.client_location_id) || item.location_name || 'Unidade arquivada' : 'Sem unidade específica'}</td>
                  <td><span>Série: {item.serial_number || '—'}</span><span>Patrimônio: {item.asset_tag || '—'}</span></td>
                  <td>{getEquipmentStatusLabel(item.status)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="print-document__footer"><span>ZION ProService · Ficha cadastral</span><span>Uso operacional</span></footer>
    </article>
  )
}

export function ClientPrintPage() {
  const { clientId } = useParams()
  const { organization, record } = useClientPrintRecord(clientId)
  const loading = organization.isLoading || (organization.isSuccess && record.isLoading)
  const error = organization.error ?? record.error

  if (loading) return <PageSkeleton rows={6} />
  if (error || !record.data) {
    return <PageState title="Ficha indisponível" description={error?.message ?? 'O cliente não foi encontrado ou está arquivado.'} tone="error" />
  }

  return (
    <section className="print-page">
      <PrintToolbar backTo={`/app/clientes/${record.data.client.id}`} backLabel="Voltar ao cliente" />
      <ClientPrintableDocument record={record.data} />
      <div className="print-page__back no-print"><Link to={`/app/clientes/${record.data.client.id}`}>Voltar ao cadastro</Link></div>
    </section>
  )
}
