import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PortalEquipmentForm } from './PortalEquipmentForm'

describe('PortalEquipmentForm', () => {
  it('mostra a unidade como contexto não editável e valida obrigatórios', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<PortalEquipmentForm unitName="Unidade Centro" onSubmit={onSubmit} />)
    expect(screen.getByText('Unidade Centro')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /unidade/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Cadastrar equipamento/ }))
    expect(screen.getByText('Informe um nome com pelo menos 2 caracteres.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('envia uma vez e bloqueia submissão duplicada', async () => {
    const user = userEvent.setup()
    let resolveSubmit: (() => void) | undefined
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => { resolveSubmit = resolve }))
    render(<PortalEquipmentForm unitName="Unidade Centro" onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText(/Nome do equipamento/), 'Esteira 01')
    await user.type(screen.getByLabelText(/Categoria/), 'Cardio')
    const submit = screen.getByRole('button', { name: /Cadastrar equipamento/ })
    await user.click(submit)
    fireEvent.submit(submit.closest('form')!)
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(submit).toBeDisabled()
    resolveSubmit?.()
  })
})
