import { useState, type FormEvent } from 'react'
import { hasValidationErrors, type FieldErrors } from '../clients/validation'
import { formatInventoryCurrency, formatInventoryQuantity } from './formatters'
import type { InventoryItemDetails, InventoryMovementInput } from './types'
import { decimalValue, validateInventoryMovement } from './validation'

const emptyMovement: InventoryMovementInput = {
  movement_type: 'entry',
  direction: 'increase',
  quantity: '',
  reason: '',
  unit_cost: '',
}

type Props = {
  item: InventoryItemDetails
  onSubmit: (input: InventoryMovementInput) => Promise<void>
}

export function InventoryMovementForm({ item, onSubmit }: Props) {
  const [input, setInput] = useState(emptyMovement)
  const [errors, setErrors] = useState<FieldErrors<InventoryMovementInput>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const quantity = input.quantity ? decimalValue(input.quantity) : 0
  const signedQuantity = input.movement_type === 'adjustment' && input.direction === 'decrease'
    ? -quantity
    : quantity
  const projectedBalance = item.current_quantity + signedQuantity

  function updateField<Key extends keyof InventoryMovementInput>(
    field: Key,
    value: InventoryMovementInput[Key],
  ) {
    setInput((current) => {
      if (field === 'movement_type') {
        return {
          ...current,
          movement_type: value as InventoryMovementInput['movement_type'],
          direction: 'increase',
          unit_cost: value === 'entry' ? current.unit_cost : '',
        }
      }
      return { ...current, [field]: value }
    })
    setIsConfirming(false)
    setSubmitError(null)
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateInventoryMovement(input)
    if (!nextErrors.quantity && projectedBalance < 0) {
      nextErrors.quantity = 'A saída informada deixaria o estoque negativo.'
    }
    setErrors(nextErrors)
    setSubmitError(null)
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
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível registrar a movimentação.')
      setIsSubmitting(false)
      setIsConfirming(false)
    }
  }

  return (
    <form className="record-form movement-form" onSubmit={handleReview} noValidate>
      <div className="movement-balance">
        <div><span>Saldo atual</span><strong>{formatInventoryQuantity(item.current_quantity, item.unit_of_measure)}</strong></div>
        <span aria-hidden="true">→</span>
        <div><span>Saldo projetado</span><strong className={projectedBalance < 0 ? 'is-negative' : ''}>{formatInventoryQuantity(projectedBalance, item.unit_of_measure)}</strong></div>
      </div>

      <fieldset className="movement-type-selector">
        <legend>Tipo de movimentação</legend>
        <label className={input.movement_type === 'entry' ? 'is-selected' : ''}>
          <input type="radio" name="movement-type" value="entry" checked={input.movement_type === 'entry'} onChange={() => updateField('movement_type', 'entry')} />
          <strong>Entrada</strong><span>Recebimento ou reposição</span>
        </label>
        <label className={input.movement_type === 'adjustment' ? 'is-selected' : ''}>
          <input type="radio" name="movement-type" value="adjustment" checked={input.movement_type === 'adjustment'} onChange={() => updateField('movement_type', 'adjustment')} />
          <strong>Ajuste manual</strong><span>Correção após conferência</span>
        </label>
      </fieldset>

      {input.movement_type === 'adjustment' && (
        <fieldset className="movement-direction-selector">
          <legend>Direção do ajuste</legend>
          <label><input type="radio" name="direction" checked={input.direction === 'increase'} onChange={() => updateField('direction', 'increase')} /> Adicionar ao saldo</label>
          <label><input type="radio" name="direction" checked={input.direction === 'decrease'} onChange={() => updateField('direction', 'decrease')} /> Remover do saldo</label>
        </fieldset>
      )}

      <div className="form-grid movement-form__grid">
        <div className="field">
          <label htmlFor="movement-quantity">Quantidade <span aria-hidden="true">*</span></label>
          <input id="movement-quantity" type="number" min="0.001" step="0.001" inputMode="decimal" value={input.quantity} onChange={(event) => updateField('quantity', event.target.value)} aria-invalid={Boolean(errors.quantity)} aria-describedby={errors.quantity ? 'movement-quantity-error' : undefined} autoFocus />
          <span className="field-help">Unidade: {item.unit_of_measure}</span>
          {errors.quantity && <span id="movement-quantity-error" className="field-error">{errors.quantity}</span>}
        </div>

        {input.movement_type === 'entry' && (
          <div className="field">
            <label htmlFor="movement-cost">Custo unitário da entrada</label>
            <input id="movement-cost" type="number" min="0" step="0.0001" inputMode="decimal" value={input.unit_cost} onChange={(event) => updateField('unit_cost', event.target.value)} aria-invalid={Boolean(errors.unit_cost)} placeholder={formatInventoryCurrency(item.average_unit_cost)} />
            <span className="field-help">Opcional. Quando informado, recalcula o custo médio.</span>
            {errors.unit_cost && <span className="field-error">{errors.unit_cost}</span>}
          </div>
        )}

        <div className="field field--wide">
          <label htmlFor="movement-reason">
            {input.movement_type === 'adjustment' ? 'Motivo do ajuste' : 'Referência ou observação'}
            {input.movement_type === 'adjustment' && <span aria-hidden="true"> *</span>}
          </label>
          <textarea id="movement-reason" value={input.reason} onChange={(event) => updateField('reason', event.target.value)} aria-invalid={Boolean(errors.reason)} rows={4} maxLength={500} placeholder={input.movement_type === 'adjustment' ? 'Ex.: Divergência identificada na contagem física' : 'Ex.: Compra do fornecedor ou número da nota'} />
          {errors.reason && <span className="field-error">{errors.reason}</span>}
        </div>
      </div>

      {isConfirming && (
        <div className="movement-confirm" role="alert">
          <div>
            <span className="eyebrow">Confirme antes de registrar</span>
            <strong>{input.movement_type === 'entry' ? 'Entrada' : 'Ajuste'} de {formatInventoryQuantity(signedQuantity, item.unit_of_measure)}</strong>
            <p>O saldo passará de {formatInventoryQuantity(item.current_quantity)} para {formatInventoryQuantity(projectedBalance)}. A movimentação será permanente.</p>
          </div>
          <div>
            <button className="secondary-button" type="button" onClick={() => setIsConfirming(false)} disabled={isSubmitting}>Revisar campos</button>
            <button className="primary-button primary-button--compact" type="button" onClick={() => void handleConfirm()} disabled={isSubmitting}>{isSubmitting ? 'Registrando…' : 'Confirmar movimentação'}</button>
          </div>
        </div>
      )}

      <div className="form-actions">
        <div className="form-status" aria-live="polite">{submitError && <div className="alert alert--error">{submitError}</div>}</div>
        {!isConfirming && <button className="primary-button primary-button--compact" type="submit">Revisar movimentação <span aria-hidden="true">→</span></button>}
      </div>
    </form>
  )
}
