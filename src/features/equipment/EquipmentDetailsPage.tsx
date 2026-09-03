import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { PageSkeleton, PageState } from '../../components/PageState'
import { formatMaintenanceDate } from '../maintenances/formatters'
import { useEquipmentMaintenanceHistory } from '../maintenances/maintenanceQueries'
import { MaintenanceStatusBadge } from '../maintenances/MaintenanceStatusBadge'
import { getMaintenanceTypeLabel } from '../maintenances/types'
import { RelevantReturns } from '../returns/RelevantReturns'
import { deleteEquipment } from './equipmentApi'
import { EquipmentStatusBadge } from './EquipmentStatusBadge'
import { equipmentKeys, useEquipmentDetails } from './equipmentQueries'

export function EquipmentDetailsPage() {
  const { equipmentId } = useParams()
  const { organization, equipment } = useEquipmentDetails(equipmentId)
  const maintenanceHistory = useEquipmentMaintenanceHistory(equipmentId).history
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [archivePending, setArchivePending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)
  const success = (location.state as { success?: string } | null)?.success ?? null

  if (organization.isLoading || equipment.isLoading) return <PageSkeleton rows={5} />

  const error = organization.error ?? equipment.error
  if (error || !organization.data || !equipment.data) {
    return (
      <PageState
        title="Equipamento indisponível"
        description={error instanceof Error ? error.message : 'O equipamento não foi encontrado.'}
        actionLabel="Voltar para equipamentos"
        onAction={() => navigate('/app/equipamentos')}
        tone="error"
      />
    )
  }

  const details = equipment.data

  async function handleDelete() {
    setIsArchiving(true)
    setActionError(null)
    try {
      await deleteEquipment(organization.data!, details.id)
      await queryClient.invalidateQueries({ queryKey: equipmentKeys.all })
      navigate('/app/equipamentos', {
        replace: true,
        state: { success: 'Equipamento arquivado com sucesso.' },
      })
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Não foi possível arquivar o equipamento.',
      )
      setArchivePending(false)
      setIsArchiving(false)
    }
  }

  return (
    <section className="equipment-details" aria-labelledby="equipment-name">
      <Link className="back-link" to="/app/equipamentos">← Voltar para equipamentos</Link>

      <div className="equipment-details__heading">
        <div className="equipment-details__identity">
          <span className="equipment-detail-mark" aria-hidden="true">EQ</span>
          <div>
            <span className="eyebrow">{details.category}</span>
            <h1 id="equipment-name">{details.name}</h1>
            <EquipmentStatusBadge status={details.status} />
          </div>
        </div>
        <div className="client-details__actions">
          <Link className="secondary-button secondary-button--link" to={`/app/equipamentos/${details.id}/editar`}>
            Editar equipamento
          </Link>
          {!archivePending ? (
            <button className="danger-text-button" type="button" onClick={() => setArchivePending(true)}>
              Arquivar equipamento
            </button>
          ) : (
            <div className="archive-confirm" role="alert">
              <span>Arquivar equipamento? O histórico será preservado.</span>
              <button type="button" onClick={() => void handleDelete()} disabled={isArchiving}>
                {isArchiving ? 'Arquivando…' : 'Sim, arquivar'}
              </button>
              <button type="button" onClick={() => setArchivePending(false)} disabled={isArchiving}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="action-messages" aria-live="polite">
        {success && <div className="alert alert--success">{success}</div>}
        {actionError && <div className="alert alert--error">{actionError}</div>}
      </div>

      <div className="equipment-info-grid">
        <article className="info-card equipment-owner-card">
          <span className="eyebrow">Cadastro geral</span>
          <dl>
            <div><dt>Categoria</dt><dd>{details.category}</dd></div>
            <div><dt>Status</dt><dd>Disponível para seleção nos relatórios de visita</dd></div>
          </dl>
        </article>

        <article className="info-card">
          <span className="eyebrow">Identificação</span>
          <dl>
            <div><dt>Marca</dt><dd>{details.brand || 'Não informada'}</dd></div>
            <div><dt>Modelo</dt><dd>{details.model || 'Não informado'}</dd></div>
            <div><dt>Série</dt><dd>{details.serial_number || 'Não informada'}</dd></div>
            <div><dt>Patrimônio</dt><dd>{details.asset_tag || 'Não informado'}</dd></div>
          </dl>
        </article>

        <article className="info-card info-card--notes equipment-notes-card">
          <span className="eyebrow">Observações</span>
          <p>{details.notes || 'Nenhuma observação registrada.'}</p>
        </article>
      </div>

      <RelevantReturns equipmentId={details.id} />

      <section className="maintenance-preview" aria-labelledby="maintenance-history-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Linha do tempo técnica</span>
            <h2 id="maintenance-history-title">Histórico de manutenções</h2>
          </div>
          <Link className="secondary-button secondary-button--link" to={`/app/manutencoes/nova?equipmentId=${details.id}`}>
            Nova OS
          </Link>
        </div>
        {maintenanceHistory.isLoading && <PageSkeleton rows={3} />}
        {maintenanceHistory.isError && (
          <PageState
            title="Histórico indisponível"
            description={maintenanceHistory.error.message}
            actionLabel="Tentar novamente"
            onAction={() => void maintenanceHistory.refetch()}
            tone="error"
          />
        )}
        {maintenanceHistory.isSuccess && maintenanceHistory.data.length === 0 && (
          <PageState
            title="Nenhuma manutenção registrada"
            description="Crie a primeira ordem de serviço para iniciar a linha do tempo deste equipamento."
          />
        )}
        {maintenanceHistory.isSuccess && maintenanceHistory.data.length > 0 && (
          <div className="equipment-maintenance-timeline">
            {maintenanceHistory.data.map((item) => (
              <Link to={`/app/manutencoes/${item.id}`} key={item.id}>
                <span className="timeline-node" aria-hidden="true" />
                <div>
                  <strong>{item.work_order_number}</strong>
                  <span>{getMaintenanceTypeLabel(item.maintenance_type)} · {formatMaintenanceDate(item.scheduled_at)}</span>
                </div>
                <MaintenanceStatusBadge status={item.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
