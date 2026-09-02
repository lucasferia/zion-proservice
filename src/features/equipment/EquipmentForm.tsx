import { useMemo, useState, type FormEvent } from 'react'
import { hasValidationErrors, type FieldErrors } from '../clients/validation'
import { EQUIPMENT_STATUSES, type EquipmentFormOptions, type EquipmentInput } from './types'
import { validateEquipment } from './validation'

const emptyEquipment: EquipmentInput = {
  client_id: '',
  client_location_id: '',
  name: '',
  category: '',
  brand: '',
  model: '',
  serial_number: '',
  asset_tag: '',
  status: 'operational',
  notes: '',
}

type EquipmentFormProps = {
  options: EquipmentFormOptions
  initialValue?: EquipmentInput
  submitLabel: string
  onSubmit: (input: EquipmentInput) => Promise<void>
}

export function EquipmentForm({
  options,
  initialValue = emptyEquipment,
  submitLabel,
  onSubmit,
}: EquipmentFormProps) {
  const [input, setInput] = useState(initialValue)
  const [errors, setErrors] = useState<FieldErrors<EquipmentInput>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const availableLocations = useMemo(
    () => options.locations.filter((location) => location.client_id === input.client_id),
    [input.client_id, options.locations],
  )

  function updateField<Key extends keyof EquipmentInput>(field: Key, value: EquipmentInput[Key]) {
    setInput((current) => {
      if (field === 'client_id') {
        const selectedLocation = options.locations.find(
          (location) => location.id === current.client_location_id,
        )
        return {
          ...current,
          client_id: value as string,
          client_location_id: selectedLocation?.client_id === value ? current.client_location_id : '',
        }
      }
      return { ...current, [field]: value }
    })
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateEquipment(input)
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
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível salvar o equipamento.')
      setIsSubmitting(false)
    }
  }

  return (
    <form className="record-form equipment-form" onSubmit={handleSubmit} noValidate>
      <div className="form-section-heading">
        <span className="form-section-heading__index" aria-hidden="true">01</span>
        <div>
          <h2>Vínculo operacional</h2>
          <p>O cliente é obrigatório. A lista de unidades sempre acompanha o cliente selecionado.</p>
        </div>
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="equipment-client">Cliente <span aria-hidden="true">*</span></label>
          <select
            id="equipment-client"
            value={input.client_id}
            onChange={(event) => updateField('client_id', event.target.value)}
            aria-invalid={Boolean(errors.client_id)}
            aria-describedby={errors.client_id ? 'equipment-client-error' : undefined}
            autoFocus
          >
            <option value="">Selecione um cliente</option>
            {options.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
          {errors.client_id && <span id="equipment-client-error" className="field-error">{errors.client_id}</span>}
        </div>

        <div className="field">
          <label htmlFor="equipment-location">Unidade</label>
          <select
            id="equipment-location"
            value={input.client_location_id}
            onChange={(event) => updateField('client_location_id', event.target.value)}
            disabled={!input.client_id || availableLocations.length === 0}
          >
            <option value="">Sem unidade específica</option>
            {availableLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name} · {location.city}/{location.state}
              </option>
            ))}
          </select>
          <span className="field-help">
            {!input.client_id
              ? 'Selecione primeiro um cliente.'
              : availableLocations.length === 0
                ? 'Este cliente ainda não possui unidades ativas.'
                : 'Opcional. Escolha onde o equipamento está instalado.'}
          </span>
        </div>
      </div>

      <div className="form-section-heading form-section-heading--divided">
        <span className="form-section-heading__index" aria-hidden="true">02</span>
        <div>
          <h2>Identificação do ativo</h2>
          <p>Use os códigos existentes na máquina para facilitar visitas e futuras manutenções.</p>
        </div>
      </div>

      <div className="form-grid">
        <div className="field field--wide">
          <label htmlFor="equipment-name">Nome do equipamento <span aria-hidden="true">*</span></label>
          <input
            id="equipment-name"
            value={input.name}
            onChange={(event) => updateField('name', event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'equipment-name-error' : undefined}
            placeholder="Ex.: Esteira Performance 01"
            maxLength={160}
          />
          {errors.name && <span id="equipment-name-error" className="field-error">{errors.name}</span>}
        </div>

        <div className="field">
          <label htmlFor="equipment-category">Categoria <span aria-hidden="true">*</span></label>
          <input
            id="equipment-category"
            list="equipment-categories"
            value={input.category}
            onChange={(event) => updateField('category', event.target.value)}
            aria-invalid={Boolean(errors.category)}
            aria-describedby={errors.category ? 'equipment-category-error' : undefined}
            placeholder="Ex.: Cardio"
            maxLength={80}
          />
          <datalist id="equipment-categories">
            {options.categories.map((category) => <option key={category} value={category} />)}
          </datalist>
          {errors.category && <span id="equipment-category-error" className="field-error">{errors.category}</span>}
        </div>

        <div className="field">
          <label htmlFor="equipment-status">Status <span aria-hidden="true">*</span></label>
          <select
            id="equipment-status"
            value={input.status}
            onChange={(event) => updateField('status', event.target.value as EquipmentInput['status'])}
            aria-invalid={Boolean(errors.status)}
          >
            {EQUIPMENT_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
          {errors.status && <span className="field-error">{errors.status}</span>}
        </div>

        <div className="field">
          <label htmlFor="equipment-brand">Marca</label>
          <input id="equipment-brand" value={input.brand} onChange={(event) => updateField('brand', event.target.value)} aria-invalid={Boolean(errors.brand)} maxLength={100} />
          {errors.brand && <span className="field-error">{errors.brand}</span>}
        </div>

        <div className="field">
          <label htmlFor="equipment-model">Modelo</label>
          <input id="equipment-model" value={input.model} onChange={(event) => updateField('model', event.target.value)} aria-invalid={Boolean(errors.model)} maxLength={120} />
          {errors.model && <span className="field-error">{errors.model}</span>}
        </div>

        <div className="field">
          <label htmlFor="equipment-serial">Número de série</label>
          <input id="equipment-serial" value={input.serial_number} onChange={(event) => updateField('serial_number', event.target.value)} aria-invalid={Boolean(errors.serial_number)} maxLength={120} autoComplete="off" />
          {errors.serial_number && <span className="field-error">{errors.serial_number}</span>}
        </div>

        <div className="field">
          <label htmlFor="equipment-asset-tag">Patrimônio</label>
          <input id="equipment-asset-tag" value={input.asset_tag} onChange={(event) => updateField('asset_tag', event.target.value)} aria-invalid={Boolean(errors.asset_tag)} maxLength={80} autoComplete="off" />
          {errors.asset_tag && <span className="field-error">{errors.asset_tag}</span>}
        </div>

        <div className="field field--wide">
          <label htmlFor="equipment-notes">Observações</label>
          <textarea
            id="equipment-notes"
            value={input.notes}
            onChange={(event) => updateField('notes', event.target.value)}
            aria-invalid={Boolean(errors.notes)}
            rows={5}
            maxLength={2000}
            placeholder="Condição visual, acessórios, restrições de acesso ou outras informações úteis."
          />
          {errors.notes && <span className="field-error">{errors.notes}</span>}
        </div>
      </div>

      <div className="form-actions">
        <div className="form-status" aria-live="polite">
          {submitError && <div className="alert alert--error">{submitError}</div>}
        </div>
        <button className="primary-button primary-button--compact" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : submitLabel}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  )
}
