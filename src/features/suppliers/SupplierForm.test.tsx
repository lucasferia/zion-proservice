import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SupplierForm } from './SupplierForm'

describe('SupplierForm', () => {
  it('foca e informa o nome obrigatório', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<SupplierForm submitLabel="Cadastrar fornecedor" onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: /Cadastrar fornecedor/ }))
    expect(screen.getByText(/nome ou razão social/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Razão social ou nome/)).toHaveFocus()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('envia um cadastro válido', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<SupplierForm submitLabel="Cadastrar fornecedor" onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText(/Razão social ou nome/), 'Fornecedor Zion')
    await user.type(screen.getByLabelText('E-mail'), 'contato@zion.test')
    await user.click(screen.getByRole('button', { name: /Cadastrar fornecedor/ }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ legal_name: 'Fornecedor Zion', email: 'contato@zion.test' }))
  })
})
