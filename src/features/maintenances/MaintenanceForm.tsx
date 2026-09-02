import { useMemo, useState, type FormEvent } from 'react'
import { hasValidationErrors, type FieldErrors } from '../clients/validation'
import { todayValue } from '../returns/formatters'
import {
  MAINTENANCE_TYPES,
  type MaintenanceFormOptions,
  type MaintenanceInput,
} from './types'
import { validateMaintenance } from './validation'

type MaintenanceFormProps = {
  options: MaintenanceFormOptions
  initialValue: MaintenanceInput
  isEditing?: boolean
  submitLabel: string
  onSubmit: (input: MaintenanceInput) => Promise<void>
}

export function MaintenanceForm({
  options,
  initialValue,
  isEditing = false,
  submitLabel,
  onSubmit,
}: MaintenanceFormProps) {
  const [input, setInput] = useState(initialValue)
  const [errors, setErrors] = useState<FieldErrors<MaintenanceInput>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const availableLocations = useMemo(
    () => options.locations.filter((location) => location.client_id === input.client_id),
    [input.client_id, options.locations],
  )

  function updateField<Key extends keyof MaintenanceInput>(field: Key, value: MaintenanceInput[Key]) {
    setInput((current) => {
      if (field === 'client_id') {
        const locationStillValid = options.locations.some(
          (location) => location.id === current.client_location_id && location.client_id === value,
        )
        return {
          ...current,
          client_id: value as string,
          client_location_id: locationStillValid ? current.client_location_id : '',
        }
      }
      return { ...current, [field]: value }
    })
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateMaintenance(input)
    setErrors(nextErrors)
    setSubmitError(null)
    if (hasValidationErrors(nextErrors)) {
      event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(input)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível salvar a manutenção.')
      setIsSubmitting(false)
    }
  }

  return (
    <form className="record-form maintenance-form" onSubmit={handleSubmit} noValidate>
      <div className="form-section-heading">
        <span className="form-section-heading__index" aria-hidden="true">01</span>
        <div><h2>Contexto da visita</h2><p>Informe separadamente quem recebeu o atendimento, a unidade visitada e o equipamento do catálogo geral.</p></div>
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="maintenance-client">Cliente <span aria-hidden="true">*</span></label>
          <select id="maintenance-client" value={input.client_id} onChange={(event) => updateField('client_id', event.target.value)} aria-invalid={Boolean(errors.client_id)} autoFocus>
            <option value="">Selecione um cliente</option>
            {options.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
          {errors.client_id && <span className="field-error">{errors.client_id}</span>}
        </div>
        <div className="field">
          <label htmlFor="maintenance-equipment">Equipamento <span aria-hidden="true">*</span></label>
          <select id="maintenance-equipment" value={input.equipment_id} onChange={(event) => updateField('equipment_id', event.target.value)} aria-invalid={Boolean(errors.equipment_id)}>
            <option value="">Selecione o equipamento</option>
            {options.equipment.map((equipment) => <option key={equipment.id} value={equipment.id}>{equipment.name} · {equipment.category}</option>)}
          </select>
          {errors.equipment_id && <span className="field-error">{errors.equipment_id}</span>}
        </div>
        <div className="field">
          <label htmlFor="maintenance-location">Unidade visitada</label>
          <select id="maintenance-location" value={input.client_location_id} onChange={(event) => updateField('client_location_id', event.target.value)} disabled={!input.client_id}>
            <option value="">Sem unidade específica</option>
            {availableLocations.map((location) => <option key={location.id} value={location.id}>{location.name} · {location.city}/{location.state}</option>)}
          </select>
          <span className="field-help">Opcional. As unidades exibidas pertencem ao cliente selecionado.</span>
        </div>
        <div className="field">
          <label htmlFor="maintenance-scheduled">Data e hora <span aria-hidden="true">*</span></label>
          <input id="maintenance-scheduled" type="datetime-local" value={input.scheduled_at} onChange={(event) => updateField('scheduled_at', event.target.value)} aria-invalid={Boolean(errors.scheduled_at)} />
          {errors.scheduled_at && <span className="field-error">{errors.scheduled_at}</span>}
        </div>
        <div className="field">
          <label htmlFor="maintenance-type">Tipo <span aria-hidden="true">*</span></label>
          <select id="maintenance-type" value={input.maintenance_type} onChange={(event) => updateField('maintenance_type', event.target.value as MaintenanceInput['maintenance_type'])}>
            {MAINTENANCE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="maintenance-technician">Técnico responsável <span aria-hidden="true">*</span></label>
          <select id="maintenance-technician" value={input.responsible_technician_id} onChange={(event) => updateField('responsible_technician_id', event.target.value)} aria-invalid={Boolean(errors.responsible_technician_id)}>
            <option value="">Selecione o responsável</option>
            {options.technicians.map((technician) => <option key={technician.user_id} value={technician.user_id}>{technician.full_name} · {technician.role === 'owner' ? 'Owner' : 'Técnico'}</option>)}
          </select>
          {errors.responsible_technician_id && <span className="field-error">{errors.responsible_technician_id}</span>}
        </div>
        {isEditing && (
          <div className="field">
            <label htmlFor="maintenance-status">Etapa operacional</label>
            <select id="maintenance-status" value={input.status} onChange={(event) => updateField('status', event.target.value as MaintenanceInput['status'])}>
              <option value="draft">Rascunho</option>
              <option value="in_progress">Em andamento</option>
            </select>
          </div>
        )}
      </div>

      <div className="form-section-heading form-section-heading--divided">
        <span className="form-section-heading__index" aria-hidden="true">02</span>
        <div><h2>Relatório e próximo contato</h2><p>Registre o trabalho executado e deixe o reagendamento definido antes de concluir a OS.</p></div>
      </div>
      <div className="form-grid maintenance-notes-grid">
        <div className="field field--wide">
          <label htmlFor="maintenance-diagnosis">Diagnóstico</label>
          <textarea id="maintenance-diagnosis" rows={5} maxLength={4000} value={input.diagnosis} onChange={(event) => updateField('diagnosis', event.target.value)} aria-invalid={Boolean(errors.diagnosis)} placeholder="Sintomas encontrados, testes e causa provável." />
          {errors.diagnosis && <span className="field-error">{errors.diagnosis}</span>}
        </div>
        <div className="field field--wide">
          <label htmlFor="maintenance-service">Serviço realizado</label>
          <textarea id="maintenance-service" rows={5} maxLength={6000} value={input.service_performed} onChange={(event) => updateField('service_performed', event.target.value)} aria-invalid={Boolean(errors.service_performed)} placeholder="Ações executadas, regulagens e testes finais." />
          {errors.service_performed && <span className="field-error">{errors.service_performed}</span>}
        </div>
        <div className="field">
          <label htmlFor="maintenance-amount">Valor total informado</label>
          <div className="money-input"><span>R$</span><input id="maintenance-amount" inputMode="decimal" value={input.total_amount} onChange={(event) => updateField('total_amount', event.target.value)} aria-invalid={Boolean(errors.total_amount)} /></div>
          {errors.total_amount && <span className="field-error">{errors.total_amount}</span>}
          <span className="field-help">O recebimento é registrado separadamente na área financeira.</span>
        </div>
        <div className="field">
          <label htmlFor="maintenance-return-date">Data de reagendamento <span aria-hidden="true">*</span></label>
          <input id="maintenance-return-date" type="date" min={todayValue()} value={input.next_return_date} onChange={(event) => updateField('next_return_date', event.target.value)} aria-invalid={Boolean(errors.next_return_date)} />
          {errors.next_return_date && <span className="field-error">{errors.next_return_date}</span>}
          <span className="field-help">Ao concluir a OS, esta data entrará automaticamente na agenda.</span>
        </div>
        <div className="field field--wide">
          <label htmlFor="maintenance-notes">Observações</label>
          <textarea id="maintenance-notes" rows={4} maxLength={3000} value={input.notes} onChange={(event) => updateField('notes', event.target.value)} aria-invalid={Boolean(errors.notes)} placeholder="Condições de acesso, recomendações ou informações adicionais." />
          {errors.notes && <span className="field-error">{errors.notes}</span>}
        </div>
      </div>

      <div className="form-actions">
        <div className="form-status" aria-live="polite">{submitError && <div className="alert alert--error">{submitError}</div>}</div>
        <button className="primary-button primary-button--compact" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : submitLabel}<span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  )
}
