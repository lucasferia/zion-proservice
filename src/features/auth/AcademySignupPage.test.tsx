import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AcademySignupPage } from './AcademySignupPage'
import { validateAcademySignup } from './academySignupValidation'
import { useAuth } from './auth-context'

vi.mock('./auth-context', async (importOriginal) => {
  const original = await importOriginal<typeof import('./auth-context')>()
  return { ...original, useAuth: vi.fn() }
})

const mockedUseAuth = vi.mocked(useAuth)

describe('AcademySignupPage', () => {
  const signUpAcademy = vi.fn()

  beforeEach(() => {
    signUpAcademy.mockReset()
    signUpAcademy.mockResolvedValue({ error: null, emailConfirmationRequired: true })
    mockedUseAuth.mockReturnValue({
      session: null,
      status: 'unauthenticated',
      accessStatus: 'idle',
      accessContext: null,
      signIn: vi.fn(),
      signUpAcademy,
      signOut: vi.fn(),
      retryAccessResolution: vi.fn(),
    })
  })

  it('valida nome, e-mail, senha e confirmação', () => {
    expect(validateAcademySignup({
      fullName: 'A', email: 'invalido', password: 'curta', passwordConfirmation: 'outra',
    })).toEqual({
      fullName: 'Informe seu nome completo.',
      email: 'Informe um e-mail válido.',
      password: 'Use ao menos 8 caracteres, incluindo uma letra e um número.',
      passwordConfirmation: 'As senhas precisam ser idênticas.',
    })
  })

  it('exige explicitamente a confirmação da senha vazia', () => {
    expect(validateAcademySignup({
      fullName: '', email: '', password: '', passwordConfirmation: '',
    }).passwordConfirmation).toBe('Confirme sua senha.')
  })

  it('envia somente os dados públicos permitidos e orienta a confirmação', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/portal/cadastro']}>
        <Routes>
          <Route path="/portal/cadastro" element={<AcademySignupPage />} />
          <Route path="/portal/cadastro/confirmar-email" element={<div>Confirme seu e-mail</div>} />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Nome completo'), '  Maria Academia  ')
    await user.type(screen.getByLabelText('E-mail'), 'MARIA@EXAMPLE.COM')
    await user.type(screen.getByLabelText('Senha'), 'Academia123')
    await user.type(screen.getByLabelText('Confirme a senha'), 'Academia123')
    await user.click(screen.getByRole('button', { name: /Criar acesso pendente/ }))

    expect(signUpAcademy).toHaveBeenCalledWith({
      fullName: 'Maria Academia', email: 'MARIA@EXAMPLE.COM', password: 'Academia123',
    })
    expect(await screen.findByText('Confirme seu e-mail')).toBeInTheDocument()
  })

  it('não informa sucesso quando o backend falha', async () => {
    signUpAcademy.mockResolvedValue({ error: 'Não foi possível concluir o cadastro agora.', emailConfirmationRequired: false })
    const user = userEvent.setup()
    render(<MemoryRouter><AcademySignupPage /></MemoryRouter>)

    await user.type(screen.getByLabelText('Nome completo'), 'Maria Academia')
    await user.type(screen.getByLabelText('E-mail'), 'maria@example.com')
    await user.type(screen.getByLabelText('Senha'), 'Academia123')
    await user.type(screen.getByLabelText('Confirme a senha'), 'Academia123')
    await user.click(screen.getByRole('button', { name: /Criar acesso pendente/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir o cadastro agora.')
  })
})
