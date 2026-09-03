import { useState, type FormEvent } from 'react'
import { hasValidationErrors, type FieldErrors } from '../clients/validation'
import { SUPPLIER_STATUSES, type SupplierInput } from './types'
import { validateSupplier } from './validation'

const emptySupplier: SupplierInput = {
  legal_name: '',
  trade_name: '',
  tax_id: '',
  contact_name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
  status: 'active',
}

type Props = {
  initialValue?: SupplierInput
  submitLabel: string
  onSubmit: (input: SupplierInput) => Promise<void>
}

export function SupplierForm({ initialValue = emptySupplier, submitLabel, onSubmit }: Props) {
  const [input, setInput] = useState(initialValue)
  const [errors, setErrors] = useState<FieldErrors<SupplierInput>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function update<Key extends keyof SupplierInput>(field: Key, value: SupplierInput[Key]) {
    setInput((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateSupplier(input)
    setErrors(nextErrors)
    setSubmitError(null)
    if (hasValidationErrors(nextErrors)) {
      const firstInvalidField = Object.keys(nextErrors)[0] as keyof SupplierInput | undefined
      const fieldIds: Partial<Record<keyof SupplierInput, string>> = {
        legal_name: 'supplier-legal-name',
        trade_name: 'supplier-trade-name',
        tax_id: 'supplier-tax-id',
        contact_name: 'supplier-contact',
        phone: 'supplier-phone',
        email: 'supplier-email',
        address: 'supplier-address',
        notes: 'supplier-notes',
        status: 'supplier-status',
      }
      if (firstInvalidField) document.getElementById(fieldIds[firstInvalidField] ?? '')?.focus()
      return
    }
    setIsSubmitting(true)
    try {
      await onSubmit(input)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível salvar o fornecedor.')
      setIsSubmitting(false)
    }
  }

  return (
    <form className="record-form supplier-form" onSubmit={handleSubmit} noValidate>
      <div className="form-section-heading">
        <span className="form-section-heading__index" aria-hidden="true">01</span>
        <div><h2>Identificação</h2><p>Use o nome fiscal ou o nome pelo qual você reconhece o fornecedor.</p></div>
      </div>
      <div className="form-grid">
        <div className="field field--wide">
          <label htmlFor="supplier-legal-name">Razão social ou nome <span aria-hidden="true">*</span></label>
          <input id="supplier-legal-name" value={input.legal_name} onChange={(event) => update('legal_name', event.target.value)} maxLength={160} aria-invalid={Boolean(errors.legal_name)} autoFocus />
          {errors.legal_name && <span className="field-error">{errors.legal_name}</span>}
        </div>
        <div className="field">
          <label htmlFor="supplier-trade-name">Nome fantasia</label>
          <input id="supplier-trade-name" value={input.trade_name} onChange={(event) => update('trade_name', event.target.value)} maxLength={160} aria-invalid={Boolean(errors.trade_name)} />
          {errors.trade_name && <span className="field-error">{errors.trade_name}</span>}
        </div>
        <div className="field">
          <label htmlFor="supplier-tax-id">CPF ou CNPJ</label>
          <input id="supplier-tax-id" value={input.tax_id} onChange={(event) => update('tax_id', event.target.value)} inputMode="numeric" autoComplete="off" aria-invalid={Boolean(errors.tax_id)} placeholder="Somente números ou formatado" />
          {errors.tax_id && <span className="field-error">{errors.tax_id}</span>}
        </div>
        <div className="field">
          <label htmlFor="supplier-status">Status <span aria-hidden="true">*</span></label>
          <select id="supplier-status" value={input.status} onChange={(event) => update('status', event.target.value as SupplierInput['status'])}>
            {SUPPLIER_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
        </div>
      </div>

      <div className="form-section-heading form-section-heading--divided">
        <span className="form-section-heading__index" aria-hidden="true">02</span>
        <div><h2>Contato</h2><p>Informações para cotação e reposição manual de peças.</p></div>
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="supplier-contact">Pessoa de contato</label>
          <input id="supplier-contact" value={input.contact_name} onChange={(event) => update('contact_name', event.target.value)} maxLength={120} aria-invalid={Boolean(errors.contact_name)} />
          {errors.contact_name && <span className="field-error">{errors.contact_name}</span>}
        </div>
        <div className="field">
          <label htmlFor="supplier-phone">Telefone</label>
          <input id="supplier-phone" type="tel" value={input.phone} onChange={(event) => update('phone', event.target.value)} maxLength={30} aria-invalid={Boolean(errors.phone)} autoComplete="tel" />
          {errors.phone && <span className="field-error">{errors.phone}</span>}
        </div>
        <div className="field">
          <label htmlFor="supplier-email">E-mail</label>
          <input id="supplier-email" type="email" value={input.email} onChange={(event) => update('email', event.target.value)} maxLength={160} aria-invalid={Boolean(errors.email)} autoComplete="email" />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>
        <div className="field field--wide">
          <label htmlFor="supplier-address">Endereço</label>
          <textarea id="supplier-address" value={input.address} onChange={(event) => update('address', event.target.value)} maxLength={500} rows={3} aria-invalid={Boolean(errors.address)} />
          {errors.address && <span className="field-error">{errors.address}</span>}
        </div>
        <div className="field field--wide">
          <label htmlFor="supplier-notes">Observações</label>
          <textarea id="supplier-notes" value={input.notes} onChange={(event) => update('notes', event.target.value)} maxLength={2000} rows={5} aria-invalid={Boolean(errors.notes)} />
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
