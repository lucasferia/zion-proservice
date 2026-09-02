import { useState, type FormEvent } from 'react'
import type { ClientLocationInput } from './types'
import {
  hasValidationErrors,
  validateClientLocation,
  type FieldErrors,
} from './validation'

const emptyLocation: ClientLocationInput = {
  name: '',
  postal_code: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  notes: '',
}

type ClientLocationFormProps = {
  initialValue?: ClientLocationInput
  submitLabel: string
  onSubmit: (input: ClientLocationInput) => Promise<void>
  onCancel: () => void
}

export function ClientLocationForm({
  initialValue = emptyLocation,
  submitLabel,
  onSubmit,
  onCancel,
}: ClientLocationFormProps) {
  const [input, setInput] = useState(initialValue)
  const [errors, setErrors] = useState<FieldErrors<ClientLocationInput>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(field: keyof ClientLocationInput, value: string) {
    setInput((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = { ...input, state: input.state.toUpperCase() }
    const nextErrors = validateClientLocation(normalized)
    setErrors(nextErrors)
    setSubmitError(null)

    if (hasValidationErrors(nextErrors)) {
      event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(normalized)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível salvar a unidade.')
      setIsSubmitting(false)
    }
  }

  return (
    <form className="location-form" onSubmit={handleSubmit} noValidate>
      <div className="location-form__heading">
        <div>
          <span className="eyebrow">Unidade do cliente</span>
          <h3>{submitLabel}</h3>
        </div>
        <button className="text-button" type="button" onClick={onCancel}>Cancelar</button>
      </div>

      <div className="form-grid form-grid--location">
        <div className="field field--wide">
          <label htmlFor="location-name">Nome da unidade <span aria-hidden="true">*</span></label>
          <input
            id="location-name"
            value={input.name}
            onChange={(event) => updateField('name', event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'location-name-error' : undefined}
            placeholder="Matriz, Academia Centro…"
            maxLength={120}
            autoFocus
          />
          {errors.name && <span id="location-name-error" className="field-error">{errors.name}</span>}
        </div>

        <div className="field">
          <label htmlFor="location-postal-code">CEP</label>
          <input
            id="location-postal-code"
            inputMode="numeric"
            value={input.postal_code}
            onChange={(event) => updateField('postal_code', event.target.value)}
            aria-invalid={Boolean(errors.postal_code)}
            aria-describedby={errors.postal_code ? 'location-postal-code-error' : undefined}
            maxLength={20}
          />
          {errors.postal_code && (
            <span id="location-postal-code-error" className="field-error">{errors.postal_code}</span>
          )}
        </div>

        <div className="field">
          <label htmlFor="location-street">Logradouro <span aria-hidden="true">*</span></label>
          <input
            id="location-street"
            value={input.street}
            onChange={(event) => updateField('street', event.target.value)}
            aria-invalid={Boolean(errors.street)}
            aria-describedby={errors.street ? 'location-street-error' : undefined}
            maxLength={160}
          />
          {errors.street && <span id="location-street-error" className="field-error">{errors.street}</span>}
        </div>

        <div className="field">
          <label htmlFor="location-number">Número</label>
          <input
            id="location-number"
            value={input.number}
            onChange={(event) => updateField('number', event.target.value)}
            aria-invalid={Boolean(errors.number)}
            aria-describedby={errors.number ? 'location-number-error' : undefined}
            maxLength={20}
          />
          {errors.number && <span id="location-number-error" className="field-error">{errors.number}</span>}
        </div>

        <div className="field">
          <label htmlFor="location-complement">Complemento</label>
          <input
            id="location-complement"
            value={input.complement}
            onChange={(event) => updateField('complement', event.target.value)}
            aria-invalid={Boolean(errors.complement)}
            aria-describedby={errors.complement ? 'location-complement-error' : undefined}
            maxLength={120}
          />
          {errors.complement && (
            <span id="location-complement-error" className="field-error">{errors.complement}</span>
          )}
        </div>

        <div className="field">
          <label htmlFor="location-neighborhood">Bairro</label>
          <input
            id="location-neighborhood"
            value={input.neighborhood}
            onChange={(event) => updateField('neighborhood', event.target.value)}
            aria-invalid={Boolean(errors.neighborhood)}
            aria-describedby={errors.neighborhood ? 'location-neighborhood-error' : undefined}
            maxLength={100}
          />
          {errors.neighborhood && (
            <span id="location-neighborhood-error" className="field-error">{errors.neighborhood}</span>
          )}
        </div>

        <div className="field field--city">
          <label htmlFor="location-city">Cidade <span aria-hidden="true">*</span></label>
          <input
            id="location-city"
            value={input.city}
            onChange={(event) => updateField('city', event.target.value)}
            aria-invalid={Boolean(errors.city)}
            aria-describedby={errors.city ? 'location-city-error' : undefined}
            maxLength={100}
          />
          {errors.city && <span id="location-city-error" className="field-error">{errors.city}</span>}
        </div>

        <div className="field field--state">
          <label htmlFor="location-state">UF <span aria-hidden="true">*</span></label>
          <input
            id="location-state"
            value={input.state}
            onChange={(event) => updateField('state', event.target.value.toUpperCase())}
            aria-invalid={Boolean(errors.state)}
            aria-describedby={errors.state ? 'location-state-error' : undefined}
            maxLength={2}
            autoCapitalize="characters"
          />
          {errors.state && <span id="location-state-error" className="field-error">{errors.state}</span>}
        </div>

        <div className="field field--wide">
          <label htmlFor="location-notes">Referência ou observações</label>
          <textarea
            id="location-notes"
            value={input.notes}
            onChange={(event) => updateField('notes', event.target.value)}
            aria-invalid={Boolean(errors.notes)}
            aria-describedby={errors.notes ? 'location-notes-error' : undefined}
            rows={3}
            maxLength={500}
          />
          {errors.notes && <span id="location-notes-error" className="field-error">{errors.notes}</span>}
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

