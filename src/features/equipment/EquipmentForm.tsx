import { useState, type FormEvent } from 'react'
import { hasValidationErrors, type FieldErrors } from '../clients/validation'
import { EQUIPMENT_STATUSES, type EquipmentFormOptions, type EquipmentInput } from './types'
import { validateEquipment } from './validation'

const emptyEquipment: EquipmentInput = {
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

  function updateField<Key extends keyof EquipmentInput>(field: Key, value: EquipmentInput[Key]) {
    setInput((current) => ({ ...current, [field]: value }))
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
          <h2>Identificação do equipamento</h2>
          <p>Este é um cadastro geral da organização. Cliente e unidade serão informados somente no relatório da visita.</p>
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
            autoFocus
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
