import { describe, expect, it } from 'vitest'
import type { PaymentInput } from './types'
import { validatePayment, validatePaymentCancellation } from './validation'

const received: PaymentInput = {
  amount: '100.00',
  method: 'pix',
  status: 'received',
  paid_at: '2026-08-31T12:00',
  due_date: '',
  notes: '',
}

describe('validatePayment', () => {
  it('aceita recebimento parcial dentro do limite', () => {
    expect(validatePayment(received, 200)).toEqual({})
  })

  it('bloqueia valor inválido, precisão e excedente', () => {
    expect(validatePayment({ ...received, amount: '0' }, 200).amount).toMatch(/maior que zero/)
    expect(validatePayment({ ...received, amount: '10.999' }, 200).amount).toMatch(/2 casas/)
    expect(validatePayment({ ...received, amount: '201' }, 200).amount).toMatch(/limite/)
  })

  it('exige paid_at para recebido e vencimento para pendente', () => {
    expect(validatePayment({ ...received, paid_at: '' }, 200).paid_at).toBeTruthy()
    expect(validatePayment({ ...received, status: 'pending', paid_at: '', due_date: '' }, 200).due_date).toBeTruthy()
  })

  it('valida motivo auditável de cancelamento', () => {
    expect(validatePaymentCancellation('x')).toMatch(/3 caracteres/)
    expect(validatePaymentCancellation('Motivo válido')).toBeNull()
    expect(validatePaymentCancellation('a'.repeat(501))).toMatch(/500/)
  })
})
