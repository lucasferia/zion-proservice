import { useMemo, useState, type FormEvent } from 'react'
import { businessDatePlusDays } from '../../lib/dateTime'
import { hasValidationErrors, type FieldErrors } from '../clients/validation'
import { CALENDAR_EVENT_TYPES, type CalendarEventInput, type CalendarEventOptions } from './types'
import { validateCalendarEvent } from './validation'

type Props = {
  options: CalendarEventOptions
  initialValue?: CalendarEventInput
  submitLabel: string
  onCancel: () => void
  onSubmit: (input: CalendarEventInput) => Promise<void>
}

function initialInput(): CalendarEventInput {
  return {
    title: '', description: '', event_type: 'technical_visit', is_all_day: false,
    event_date: businessDatePlusDays(1), starts_at: `${businessDatePlusDays(1)}T09:00`, ends_at: '',
    client_id: '', client_location_id: '', equipment_id: '', maintenance_id: '',
  }
}

export function CalendarEventForm({ options, initialValue, submitLabel, onCancel, onSubmit }: Props) {
  const [input, setInput] = useState<CalendarEventInput>(() => initialValue ?? initialInput())
  const [errors, setErrors] = useState<FieldErrors<CalendarEventInput>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const locations = useMemo(
    () => options.locations.filter((item) => item.client_id === input.client_id),
    [input.client_id, options.locations],
  )

  function update<Key extends keyof CalendarEventInput>(field: Key, value: CalendarEventInput[Key]) {
    setInput((current) => ({ ...current, [field]: value }))
    setSubmitError(null)
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function selectClient(clientId: string) {
    setInput((current) => ({ ...current, client_id: clientId, client_location_id: '' }))
    setErrors((current) => ({ ...current, client_id: undefined, client_location_id: undefined }))
  }

  function selectMaintenance(maintenanceId: string) {
    const maintenance = options.maintenances.find((item) => item.id === maintenanceId)
    setInput((current) => maintenance ? {
      ...current,
      maintenance_id: maintenanceId,
      client_id: maintenance.client_id,
      client_location_id: maintenance.client_location_id ?? '',
      equipment_id: maintenance.equipment_id,
    } : { ...current, maintenance_id: '' })
    setErrors({})
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    const nextErrors = validateCalendarEvent(input, options)
    setErrors(nextErrors)
    if (hasValidationErrors(nextErrors)) {
      event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit(input)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível salvar o evento.')
      setSubmitting(false)
    }
  }

  return (
    <form className="record-form calendar-event-form" onSubmit={handleSubmit} noValidate>
      <div className="return-form__intro">
        <span className="return-form__step">01</span>
        <div><span className="eyebrow">Compromisso operacional</span><h2>O que entra na agenda?</h2><p>Registre o compromisso mesmo quando ele não estiver ligado a um cliente ou OS.</p></div>
      </div>

      <div className="form-grid return-form__grid">
        <div className="field field--wide">
          <label htmlFor="event-title">Título <span aria-hidden="true">*</span></label>
          <input id="event-title" value={input.title} maxLength={160} autoFocus onChange={(event) => update('title', event.target.value)} aria-invalid={Boolean(errors.title)} placeholder="Ex.: Visita técnica na unidade central" />
          {errors.title && <span className="field-error">{errors.title}</span>}
        </div>
        <div className="field">
          <label htmlFor="event-type">Tipo <span aria-hidden="true">*</span></label>
          <select id="event-type" value={input.event_type} onChange={(event) => update('event_type', event.target.value as CalendarEventInput['event_type'])}>
            {CALENDAR_EVENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <label className="calendar-event-form__all-day">
          <input type="checkbox" checked={input.is_all_day} onChange={(event) => update('is_all_day', event.target.checked)} />
          <span><strong>Dia inteiro</strong><small>Sem horário específico e sem conversão de fuso.</small></span>
        </label>
        {input.is_all_day ? (
          <div className="field">
            <label htmlFor="event-date">Data <span aria-hidden="true">*</span></label>
            <input id="event-date" type="date" value={input.event_date} onChange={(event) => update('event_date', event.target.value)} aria-invalid={Boolean(errors.event_date)} />
            {errors.event_date && <span className="field-error">{errors.event_date}</span>}
          </div>
        ) : <>
          <div className="field">
            <label htmlFor="event-start">Início <span aria-hidden="true">*</span></label>
            <input id="event-start" type="datetime-local" value={input.starts_at} onChange={(event) => update('starts_at', event.target.value)} aria-invalid={Boolean(errors.starts_at)} />
            {errors.starts_at && <span className="field-error">{errors.starts_at}</span>}
          </div>
          <div className="field">
            <label htmlFor="event-end">Término opcional</label>
            <input id="event-end" type="datetime-local" value={input.ends_at} onChange={(event) => update('ends_at', event.target.value)} aria-invalid={Boolean(errors.ends_at)} />
            {errors.ends_at && <span className="field-error">{errors.ends_at}</span>}
          </div>
        </>}
        <div className="field field--wide">
          <label htmlFor="event-description">Descrição</label>
          <textarea id="event-description" rows={4} maxLength={3000} value={input.description} onChange={(event) => update('description', event.target.value)} aria-invalid={Boolean(errors.description)} placeholder="Contexto, objetivo e orientações para o compromisso" />
          <div className="field-meta"><span>{errors.description ?? 'Opcional.'}</span><span>{input.description.length}/3000</span></div>
        </div>
      </div>

      <div className="return-form__intro calendar-event-form__links-heading">
        <span className="return-form__step">02</span>
        <div><span className="eyebrow">Contexto opcional</span><h2>Vínculos do evento</h2><p>Todos são opcionais. Equipamentos continuam independentes de cliente e unidade.</p></div>
      </div>
      <div className="form-grid return-form__grid">
        <div className="field field--wide">
          <label htmlFor="event-maintenance">Ordem de serviço</label>
          <select id="event-maintenance" value={input.maintenance_id} onChange={(event) => selectMaintenance(event.target.value)} aria-invalid={Boolean(errors.maintenance_id)}>
            <option value="">Sem OS vinculada</option>
            {options.maintenances.map((item) => <option key={item.id} value={item.id}>{item.work_order_number} · {item.status}</option>)}
          </select>
          {errors.maintenance_id && <span className="field-error">{errors.maintenance_id}</span>}
          <small className="field-hint">Ao escolher uma OS, seus vínculos são preenchidos para evitar inconsistências.</small>
        </div>
        <div className="field">
          <label htmlFor="event-client">Cliente</label>
          <select id="event-client" value={input.client_id} onChange={(event) => selectClient(event.target.value)} aria-invalid={Boolean(errors.client_id)}>
            <option value="">Sem cliente</option>
            {options.clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          {errors.client_id && <span className="field-error">{errors.client_id}</span>}
        </div>
        <div className="field">
          <label htmlFor="event-location">Unidade</label>
          <select id="event-location" value={input.client_location_id} disabled={!input.client_id} onChange={(event) => update('client_location_id', event.target.value)} aria-invalid={Boolean(errors.client_location_id)}>
            <option value="">Sem unidade</option>
            {locations.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.city}/{item.state}</option>)}
          </select>
          {errors.client_location_id && <span className="field-error">{errors.client_location_id}</span>}
        </div>
        <div className="field field--wide">
          <label htmlFor="event-equipment">Equipamento</label>
          <select id="event-equipment" value={input.equipment_id} onChange={(event) => update('equipment_id', event.target.value)} aria-invalid={Boolean(errors.equipment_id)}>
            <option value="">Sem equipamento</option>
            {options.equipment.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.category}</option>)}
          </select>
          {errors.equipment_id && <span className="field-error">{errors.equipment_id}</span>}
        </div>
      </div>

      <div className="form-actions">
        <div className="form-status" aria-live="polite">{submitError && <div className="alert alert--error" role="alert">{submitError}</div>}</div>
        <div className="calendar-event-form__actions"><button className="secondary-button" type="button" disabled={submitting} onClick={onCancel}>Cancelar</button><button className="primary-button primary-button--compact" type="submit" disabled={submitting}>{submitting ? 'Salvando…' : submitLabel}</button></div>
      </div>
    </form>
  )
}
