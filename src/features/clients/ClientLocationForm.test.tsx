import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ClientLocationForm } from './ClientLocationForm'

describe('ClientLocationForm', () => {
  it('normaliza a UF e envia uma unidade válida', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <ClientLocationForm
        submitLabel="Adicionar unidade"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText(/Nome da unidade/), 'Matriz')
    await user.type(screen.getByLabelText(/Logradouro/), 'Rua Central')
    await user.type(screen.getByLabelText(/Cidade/), 'Curitiba')
    await user.type(screen.getByLabelText(/UF/), 'pr')
    await user.click(screen.getByRole('button', { name: /Adicionar unidade/ }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ state: 'PR' }))
  })
})

