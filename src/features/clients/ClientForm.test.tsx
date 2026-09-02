import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ClientForm } from './ClientForm'

describe('ClientForm', () => {
  it('mostra validações e não envia um cadastro inválido', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ClientForm submitLabel="Cadastrar cliente" onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: /Cadastrar cliente/ }))

    expect(screen.getByText('Informe um nome com pelo menos 2 caracteres.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('envia os dados preenchidos quando são válidos', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<ClientForm submitLabel="Cadastrar cliente" onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/Nome do cliente/), 'Academia Central')
    await user.type(screen.getByLabelText('Telefone'), '(41) 99999-0000')
    await user.type(screen.getByLabelText('E-mail'), 'contato@academia.com')
    await user.click(screen.getByRole('button', { name: /Cadastrar cliente/ }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Academia Central',
        phone: '(41) 99999-0000',
        email: 'contato@academia.com',
      }),
    )
  })
})

