import { useMemo, useState, type FormEvent } from 'react'
import { hasValidationErrors, type FieldErrors } from '../clients/validation'
import { datePlusDays, formatReturnDate, todayValue } from './formatters'
import type { ReturnScheduleInput, ReturnScheduleOptions } from './types'
import { validateReturnSchedule } from './validation'

type Props = {
  options: ReturnScheduleOptions
  onSubmit: (input: ReturnScheduleInput) => Promise<void>
}

function initialInput(): ReturnScheduleInput {
  return { client_id: '', client_location_id: '', equipment_id: '', scheduled_date: datePlusDays(30), notes: '' }
}

export function ReturnScheduleForm({ options, onSubmit }: Props) {
  const [input, setInput] = useState(initialInput)
  const [errors, setErrors] = useState<FieldErrors<ReturnScheduleInput>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const locationOptions = useMemo(
    () => options.locations.filter((item) => item.client_id === input.client_id),
    [input.client_id, options.locations],
  )
  const selectedEquipment = options.equipment.find((item) => item.id === input.equipment_id)

  function updateField<Key extends keyof ReturnScheduleInput>(field: Key, value: ReturnScheduleInput[Key]) {
    setInput((current) => ({ ...current, [field]: value }))
    setSubmitError(null)
    setIsConfirming(false)
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function selectClient(clientId: string) {
    setInput((current) => ({ ...current, client_id: clientId, client_location_id: '' }))
    setErrors({})
    setIsConfirming(false)
  }

  function selectEquipment(equipmentId: string) {
    setInput((current) => ({ ...current, equipment_id: equipmentId }))
    setErrors((current) => ({ ...current, equipment_id: undefined }))
    setIsConfirming(false)
  }

  function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateReturnSchedule(input, options)
    setErrors(nextErrors)
    if (hasValidationErrors(nextErrors)) {
      event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }
    setIsConfirming(true)
  }

  async function handleConfirm() {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit(input)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível agendar o retorno.')
      setIsSubmitting(false)
      setIsConfirming(false)
    }
  }

  return (
    <form className="record-form return-form" onSubmit={handleReview} noValidate>
      <div className="return-form__intro">
        <span className="return-form__step">01</span>
        <div><span className="eyebrow">Destino técnico</span><h2>Onde será o retorno?</h2><p>Escolha cliente, unidade visitada e um equipamento do catálogo geral.</p></div>
      </div>

      <div className="form-grid return-form__grid">
        <div className="field">
          <label htmlFor="return-client">Cliente <span aria-hidden="true">*</span></label>
          <select id="return-client" value={input.client_id} onChange={(event) => selectClient(event.target.value)} aria-invalid={Boolean(errors.client_id)} autoFocus>
            <option value="">Selecione</option>
            {options.clients.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}
          </select>
          {errors.client_id && <span className="field-error">{errors.client_id}</span>}
        </div>
        <div className="field">
          <label htmlFor="return-equipment">Equipamento <span aria-hidden="true">*</span></label>
          <select id="return-equipment" value={input.equipment_id} onChange={(event) => selectEquipment(event.target.value)} aria-invalid={Boolean(errors.equipment_id)}>
            <option value="">Selecione</option>
            {options.equipment.map((equipment) => <option value={equipment.id} key={equipment.id}>{equipment.name} · {equipment.category}</option>)}
          </select>
          {errors.equipment_id && <span className="field-error">{errors.equipment_id}</span>}
        </div>
        <div className="field">
          <label htmlFor="return-location">Unidade visitada</label>
          <select id="return-location" value={input.client_location_id} disabled={!input.client_id} onChange={(event) => updateField('client_location_id', event.target.value)} aria-invalid={Boolean(errors.client_location_id)}>
            <option value="">Sem unidade específica</option>
            {locationOptions.map((location) => <option value={location.id} key={location.id}>{location.name} · {location.city}/{location.state}</option>)}
          </select>
          {errors.client_location_id && <span className="field-error">{errors.client_location_id}</span>}
        </div>
        <div className="field">
          <label htmlFor="return-date">Data do retorno <span aria-hidden="true">*</span></label>
          <input id="return-date" type="date" min={todayValue()} value={input.scheduled_date} onChange={(event) => updateField('scheduled_date', event.target.value)} aria-invalid={Boolean(errors.scheduled_date)} />
          {errors.scheduled_date && <span className="field-error">{errors.scheduled_date}</span>}
        </div>
        <div className="field field--wide">
          <label htmlFor="return-notes">Orientações para o próximo atendimento</label>
          <textarea id="return-notes" rows={5} maxLength={2000} value={input.notes} onChange={(event) => updateField('notes', event.target.value)} aria-invalid={Boolean(errors.notes)} placeholder="Ex.: revisar correia e confirmar ruído relatado pelo cliente" />
          <div className="field-meta"><span>{errors.notes ?? 'Informação visível na agenda do técnico.'}</span><span>{input.notes.length}/2000</span></div>
        </div>
      </div>

      {isConfirming && (
        <div className="return-confirm" role="alert">
          <div><span className="eyebrow">Confirme o compromisso</span><strong>{formatReturnDate(input.scheduled_date)}</strong><p>{selectedEquipment?.name} · {options.clients.find((item) => item.id === input.client_id)?.name}</p></div>
          <div><button className="secondary-button" type="button" onClick={() => setIsConfirming(false)} disabled={isSubmitting}>Revisar</button><button className="primary-button primary-button--compact" type="button" onClick={() => void handleConfirm()} disabled={isSubmitting}>{isSubmitting ? 'Agendando…' : 'Confirmar retorno'}</button></div>
        </div>
      )}

      <div className="form-actions">
        <div className="form-status" aria-live="polite">{submitError && <div className="alert alert--error">{submitError}</div>}</div>
        {!isConfirming && <button className="primary-button primary-button--compact" type="submit">Revisar agendamento <span aria-hidden="true">→</span></button>}
      </div>
    </form>
  )
}
