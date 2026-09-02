import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PaymentForm } from './PaymentForm'

describe('PaymentForm', () => {
  it('bloqueia valor acima do limite disponível', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<PaymentForm availableAmount={150} workOrderNumber="OS-001" clientName="Academia" onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/Valor/), '151')
    await user.click(screen.getByRole('button', { name: /Revisar pagamento/ }))

    expect(screen.getByText(/ultrapassa o limite/)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('exige vencimento para pagamento pendente', async () => {
    const user = userEvent.setup()
    render(<PaymentForm availableAmount={150} workOrderNumber="OS-001" clientName="Academia" onSubmit={vi.fn()} />)

    await user.click(screen.getByText('Pendente'))
    await user.type(screen.getByLabelText(/Valor/), '100')
    await user.click(screen.getByRole('button', { name: /Revisar pagamento/ }))

    expect(screen.getByText(/data prevista/)).toBeInTheDocument()
  })

  it('revisa e confirma um recebimento válido', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<PaymentForm availableAmount={150} workOrderNumber="OS-001" clientName="Academia" onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/Valor/), '100')
    await user.click(screen.getByRole('button', { name: /Revisar pagamento/ }))
    expect(screen.getByText(/Este valor passará a compor/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirmar pagamento' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ amount: '100', status: 'received', method: 'pix' }))
  })
})
