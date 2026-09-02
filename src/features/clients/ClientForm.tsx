import { useState, type FormEvent } from 'react'
import type { ClientInput } from './types'
import { hasValidationErrors, validateClient, type FieldErrors } from './validation'

const emptyClient: ClientInput = {
  name: '',
  phone: '',
  email: '',
  document: '',
  notes: '',
}

type ClientFormProps = {
  initialValue?: ClientInput
  submitLabel: string
  onSubmit: (input: ClientInput) => Promise<void>
}

export function ClientForm({ initialValue = emptyClient, submitLabel, onSubmit }: ClientFormProps) {
  const [input, setInput] = useState<ClientInput>(initialValue)
  const [errors, setErrors] = useState<FieldErrors<ClientInput>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(field: keyof ClientInput, value: string) {
    setInput((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateClient(input)
    setErrors(nextErrors)
    setSubmitError(null)

    if (hasValidationErrors(nextErrors)) {
      const firstInvalid = event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')
      firstInvalid?.focus()
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(input)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível salvar o cliente.')
      setIsSubmitting(false)
    }
  }

  return (
    <form className="record-form" onSubmit={handleSubmit} noValidate>
      <div className="form-section-heading">
        <span className="form-section-heading__index">01</span>
        <div>
          <h2>Identificação e contato</h2>
          <p>O nome é obrigatório. Os demais campos podem ser preenchidos conforme disponíveis.</p>
        </div>
      </div>

      <div className="form-grid">
        <div className="field field--wide">
          <label htmlFor="client-name">Nome do cliente <span aria-hidden="true">*</span></label>
          <input
            id="client-name"
            value={input.name}
            onChange={(event) => updateField('name', event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'client-name-error' : undefined}
            maxLength={160}
            autoFocus
          />
          {errors.name && <span id="client-name-error" className="field-error">{errors.name}</span>}
        </div>

        <div className="field">
          <label htmlFor="client-phone">Telefone</label>
          <input
            id="client-phone"
            type="tel"
            inputMode="tel"
            value={input.phone}
            onChange={(event) => updateField('phone', event.target.value)}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'client-phone-error' : undefined}
            placeholder="(00) 00000-0000"
            maxLength={30}
          />
          {errors.phone && <span id="client-phone-error" className="field-error">{errors.phone}</span>}
        </div>

        <div className="field">
          <label htmlFor="client-email">E-mail</label>
          <input
            id="client-email"
            type="email"
            inputMode="email"
            value={input.email}
            onChange={(event) => updateField('email', event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'client-email-error' : undefined}
            placeholder="contato@empresa.com"
            maxLength={254}
          />
          {errors.email && <span id="client-email-error" className="field-error">{errors.email}</span>}
        </div>

        <div className="field field--wide">
          <label htmlFor="client-document">Documento</label>
          <input
            id="client-document"
            value={input.document}
            onChange={(event) => updateField('document', event.target.value)}
            aria-invalid={Boolean(errors.document)}
            aria-describedby={errors.document ? 'client-document-error' : undefined}
            placeholder="CPF, CNPJ ou identificação interna"
            maxLength={32}
          />
          {errors.document && (
            <span id="client-document-error" className="field-error">{errors.document}</span>
          )}
        </div>

        <div className="field field--wide">
          <label htmlFor="client-notes">Observações</label>
          <textarea
            id="client-notes"
            value={input.notes}
            onChange={(event) => updateField('notes', event.target.value)}
            aria-invalid={Boolean(errors.notes)}
            aria-describedby={errors.notes ? 'client-notes-error' : 'client-notes-help'}
            rows={5}
            maxLength={1000}
          />
          <span id="client-notes-help" className="field-help">Até 1.000 caracteres.</span>
          {errors.notes && <span id="client-notes-error" className="field-error">{errors.notes}</span>}
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

