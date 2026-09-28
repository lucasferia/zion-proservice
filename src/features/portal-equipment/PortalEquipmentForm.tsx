import { useRef, useState, type FormEvent } from 'react'
import { hasValidationErrors, type FieldErrors } from '../clients/validation'
import type { PortalEquipmentInput } from './types'
import { validatePortalEquipment } from './validation'

const emptyEquipment: PortalEquipmentInput = {
  name: '', category: '', brand: '', model: '', serial_number: '', asset_tag: '', notes: '',
}

type Props = {
  unitName: string
  onSubmit: (input: PortalEquipmentInput) => Promise<void>
}

export function PortalEquipmentForm({ unitName, onSubmit }: Props) {
  const [input, setInput] = useState(emptyEquipment)
  const [errors, setErrors] = useState<FieldErrors<PortalEquipmentInput>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitLock = useRef(false)

  function update<Key extends keyof PortalEquipmentInput>(key: Key, value: PortalEquipmentInput[Key]) {
    setInput((current) => ({ ...current, [key]: value }))
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitLock.current) return
    const nextErrors = validatePortalEquipment(input)
    setErrors(nextErrors)
    setSubmitError(null)
    if (hasValidationErrors(nextErrors)) {
      event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }
    submitLock.current = true
    setIsSubmitting(true)
    try {
      await onSubmit(input)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível cadastrar o equipamento.')
      submitLock.current = false
      setIsSubmitting(false)
    }
  }

  const fields = [
    ['brand', 'Marca', 100], ['model', 'Modelo', 120],
    ['serial_number', 'Número de série', 120], ['asset_tag', 'Número patrimonial', 80],
  ] as const

  return (
    <form className="portal-equipment-form" onSubmit={handleSubmit} noValidate>
      <div className="portal-form-context" aria-label="Unidade de cadastro">
        <span>Unidade vinculada</span><strong>{unitName}</strong><small>Definida pelo seu contexto seguro e validada novamente ao salvar.</small>
      </div>
      <div className="portal-form-grid">
        <div className="field field--wide">
          <label htmlFor="portal-equipment-name">Nome do equipamento <span aria-hidden="true">*</span></label>
          <input id="portal-equipment-name" value={input.name} onChange={(event) => update('name', event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'portal-equipment-name-error' : undefined} maxLength={160} autoFocus placeholder="Ex.: Esteira 01" />
          {errors.name && <span className="field-error" id="portal-equipment-name-error">{errors.name}</span>}
        </div>
        <div className="field">
          <label htmlFor="portal-equipment-category">Categoria <span aria-hidden="true">*</span></label>
          <input id="portal-equipment-category" value={input.category} onChange={(event) => update('category', event.target.value)} aria-invalid={Boolean(errors.category)} maxLength={80} placeholder="Ex.: Cardio" />
          {errors.category && <span className="field-error">{errors.category}</span>}
        </div>
        {fields.map(([key, label, maxLength]) => (
          <div className="field" key={key}>
            <label htmlFor={`portal-equipment-${key}`}>{label}</label>
            <input id={`portal-equipment-${key}`} value={input[key]} onChange={(event) => update(key, event.target.value)} aria-invalid={Boolean(errors[key])} maxLength={maxLength} autoComplete="off" />
            {errors[key] && <span className="field-error">{errors[key]}</span>}
          </div>
        ))}
        <div className="field field--wide">
          <label htmlFor="portal-equipment-notes">Observações</label>
          <textarea id="portal-equipment-notes" value={input.notes} onChange={(event) => update('notes', event.target.value)} aria-invalid={Boolean(errors.notes)} maxLength={2000} rows={5} placeholder="Identificação visual ou informação útil sobre este equipamento." />
          {errors.notes && <span className="field-error">{errors.notes}</span>}
          <small className="portal-field-hint">Estas observações ficarão disponíveis para a equipe Zion.</small>
        </div>
      </div>
      <div className="portal-form-actions">
        <div aria-live="polite">{submitError && <div className="portal-inline-alert" role="alert">{submitError}</div>}</div>
        <button className="primary-button primary-button--compact" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Cadastrando…' : 'Cadastrar equipamento'} <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  )
}
