import { useState, type FormEvent } from 'react'
import { hasValidationErrors, type FieldErrors } from '../clients/validation'
import { defaultPaidAt, formatPaymentCurrency } from './formatters'
import { PAYMENT_METHODS, type PaymentInput } from './types'
import { parsePaymentAmount, validatePayment } from './validation'

type Props = {
  availableAmount: number
  workOrderNumber: string
  clientName: string
  onSubmit: (input: PaymentInput) => Promise<void>
}

function initialPayment(): PaymentInput {
  return {
    amount: '',
    method: 'pix',
    status: 'received',
    paid_at: defaultPaidAt(),
    due_date: '',
    notes: '',
  }
}

export function PaymentForm({ availableAmount, workOrderNumber, clientName, onSubmit }: Props) {
  const [input, setInput] = useState(initialPayment)
  const [errors, setErrors] = useState<FieldErrors<PaymentInput>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const amount = Number.isFinite(parsePaymentAmount(input.amount)) ? parsePaymentAmount(input.amount) : 0

  function updateField<Key extends keyof PaymentInput>(field: Key, value: PaymentInput[Key]) {
    setInput((current) => {
      if (field === 'status') {
        const status = value as PaymentInput['status']
        return {
          ...current,
          status,
          paid_at: status === 'received' ? current.paid_at || defaultPaidAt() : '',
          due_date: status === 'pending' ? current.due_date : current.due_date,
        }
      }
      return { ...current, [field]: value }
    })
    setSubmitError(null)
    setIsConfirming(false)
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validatePayment(input, availableAmount)
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
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível registrar o pagamento.')
      setIsSubmitting(false)
      setIsConfirming(false)
    }
  }

  return (
    <form className="record-form payment-form" onSubmit={handleReview} noValidate>
      <div className="payment-capacity">
        <div><span>OS</span><strong>{workOrderNumber}</strong><small>{clientName}</small></div>
        <div><span>Limite disponível</span><strong>{formatPaymentCurrency(availableAmount)}</strong><small>pagamentos ativos não podem ultrapassar este valor</small></div>
      </div>

      <fieldset className="payment-status-selector">
        <legend>Situação inicial</legend>
        <label className={input.status === 'received' ? 'is-selected' : ''}>
          <input type="radio" name="payment-status" checked={input.status === 'received'} onChange={() => updateField('status', 'received')} />
          <strong>Já recebido</strong><span>Entra no faturamento por paid_at</span>
        </label>
        <label className={input.status === 'pending' ? 'is-selected' : ''}>
          <input type="radio" name="payment-status" checked={input.status === 'pending'} onChange={() => updateField('status', 'pending')} />
          <strong>Pendente</strong><span>Reserva o valor, mas não fatura</span>
        </label>
      </fieldset>

      <div className="form-grid payment-form__grid">
        <div className="field">
          <label htmlFor="payment-amount">Valor <span aria-hidden="true">*</span></label>
          <div className="money-input"><span>R$</span><input id="payment-amount" type="number" min="0.01" max={availableAmount} step="0.01" inputMode="decimal" value={input.amount} onChange={(event) => updateField('amount', event.target.value)} aria-invalid={Boolean(errors.amount)} aria-describedby={errors.amount ? 'payment-amount-error' : undefined} autoFocus /></div>
          {errors.amount && <span id="payment-amount-error" className="field-error">{errors.amount}</span>}
        </div>
        <div className="field">
          <label htmlFor="payment-method">Método <span aria-hidden="true">*</span></label>
          <select id="payment-method" value={input.method} onChange={(event) => updateField('method', event.target.value as PaymentInput['method'])}>
            {PAYMENT_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
          </select>
        </div>

        {input.status === 'received' ? (
          <div className="field">
            <label htmlFor="payment-paid-at">Recebido em <span aria-hidden="true">*</span></label>
            <input id="payment-paid-at" type="datetime-local" value={input.paid_at} max={defaultPaidAt()} onChange={(event) => updateField('paid_at', event.target.value)} aria-invalid={Boolean(errors.paid_at)} />
            {errors.paid_at && <span className="field-error">{errors.paid_at}</span>}
          </div>
        ) : (
          <div className="field">
            <label htmlFor="payment-due-date">Vencimento previsto <span aria-hidden="true">*</span></label>
            <input id="payment-due-date" type="date" value={input.due_date} onChange={(event) => updateField('due_date', event.target.value)} aria-invalid={Boolean(errors.due_date)} />
            {errors.due_date && <span className="field-error">{errors.due_date}</span>}
          </div>
        )}

        <div className="field field--wide">
          <label htmlFor="payment-notes">Observações</label>
          <textarea id="payment-notes" rows={4} maxLength={2000} value={input.notes} onChange={(event) => updateField('notes', event.target.value)} aria-invalid={Boolean(errors.notes)} placeholder="Ex.: Parcela 1 de 2 ou referência informada pelo cliente" />
          {errors.notes && <span className="field-error">{errors.notes}</span>}
        </div>
      </div>

      {isConfirming && (
        <div className="payment-confirm" role="alert">
          <div><span className="eyebrow">Confirme o lançamento</span><strong>{formatPaymentCurrency(amount)} · {input.status === 'received' ? 'recebido' : 'pendente'}</strong><p>{input.status === 'received' ? 'Este valor passará a compor o faturamento confirmado.' : 'Este valor reservará parte do total da OS, sem compor faturamento.'}</p></div>
          <div><button className="secondary-button" type="button" onClick={() => setIsConfirming(false)} disabled={isSubmitting}>Revisar</button><button className="primary-button primary-button--compact" type="button" onClick={() => void handleConfirm()} disabled={isSubmitting}>{isSubmitting ? 'Registrando…' : 'Confirmar pagamento'}</button></div>
        </div>
      )}

      <div className="form-actions">
        <div className="form-status" aria-live="polite">{submitError && <div className="alert alert--error">{submitError}</div>}</div>
        {!isConfirming && <button className="primary-button primary-button--compact" type="submit">Revisar pagamento <span aria-hidden="true">→</span></button>}
      </div>
    </form>
  )
}
