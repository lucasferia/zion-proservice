import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { useAuth } from './auth-context'

vi.mock('./auth-context', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)

describe('LoginPage', () => {
  const signIn = vi.fn()

  beforeEach(() => {
    signIn.mockReset()
    signIn.mockResolvedValue(null)
    mockedUseAuth.mockReturnValue({
      session: null,
      status: 'unauthenticated',
      signIn,
      signOut: vi.fn(),
    })
  })

  it('envia e-mail normalizado e senha para autenticação', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Usuário ou e-mail'), '  tecnico@zion.com  ')
    await user.type(screen.getByLabelText('Senha'), 'senha-segura')
    await user.click(screen.getByRole('button', { name: 'Entrar no ProService' }))

    expect(signIn).toHaveBeenCalledWith('tecnico@zion.com', 'senha-segura')
  })

  it('mostra erro seguro sem expor detalhes internos', async () => {
    signIn.mockResolvedValue('E-mail ou senha inválidos.')
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText('Usuário ou e-mail'), 'tecnico@zion.com')
    await user.type(screen.getByLabelText('Senha'), 'incorreta')
    await user.click(screen.getByRole('button', { name: 'Entrar no ProService' }))

    expect(await screen.findByText('E-mail ou senha inválidos.')).toBeInTheDocument()
  })

  it('bloqueia o formulário quando o ambiente não está configurado', () => {
    mockedUseAuth.mockReturnValue({
      session: null,
      status: 'configuration_error',
      signIn,
      signOut: vi.fn(),
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'A integração com o Supabase não está configurada neste ambiente.',
    )
    expect(screen.getByRole('button', { name: 'Entrar no ProService' })).toBeDisabled()
  })
})
