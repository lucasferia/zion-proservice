import { useMemo, useState, type FormEvent } from 'react'
import { hasValidationErrors, type FieldErrors } from '../clients/validation'
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

  const availableEquipment = useMemo(
    () => options.equipment.filter((equipment) => equipment.client_id === input.client_id),
    [input.client_id, options.equipment],
  )
  const selectedEquipment = options.equipment.find((equipment) => equipment.id === input.equipment_id)
  const selectedLocation = options.locations.find((location) => location.id === input.client_location_id)

  function updateField<Key extends keyof MaintenanceInput>(field: Key, value: MaintenanceInput[Key]) {
    setInput((current) => {
      if (field === 'client_id') {
        const equipmentStillValid = options.equipment.some(
          (equipment) => equipment.id === current.equipment_id && equipment.client_id === value,
        )
        return {
          ...current,
          client_id: value as string,
          equipment_id: equipmentStillValid ? current.equipment_id : '',
          client_location_id: equipmentStillValid ? current.client_location_id : '',
        }
      }
      if (field === 'equipment_id') {
        const equipment = options.equipment.find((item) => item.id === value)
        return {
          ...current,
          equipment_id: value as string,
          client_id: equipment?.client_id ?? current.client_id,
          client_location_id: equipment?.client_location_id ?? '',
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
        <div><h2>Atendimento</h2><p>O equipamento define automaticamente cliente e unidade, evitando vínculos incorretos em campo.</p></div>
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
          <select id="maintenance-equipment" value={input.equipment_id} onChange={(event) => updateField('equipment_id', event.target.value)} disabled={!input.client_id} aria-invalid={Boolean(errors.equipment_id)}>
            <option value="">Selecione o equipamento</option>
            {availableEquipment.map((equipment) => <option key={equipment.id} value={equipment.id}>{equipment.name} · {equipment.category}</option>)}
          </select>
          {errors.equipment_id && <span className="field-error">{errors.equipment_id}</span>}
        </div>
        <div className="field">
          <label htmlFor="maintenance-location">Unidade vinculada</label>
          <input id="maintenance-location" value={selectedLocation ? `${selectedLocation.name} · ${selectedLocation.city}/${selectedLocation.state}` : selectedEquipment ? 'Sem unidade específica' : ''} readOnly placeholder="Definida pelo equipamento" />
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
        <div><h2>Registro técnico</h2><p>Diagnóstico e serviço realizado serão obrigatórios no momento da conclusão.</p></div>
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
          <span className="field-help">Pagamentos serão tratados em uma etapa futura.</span>
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
