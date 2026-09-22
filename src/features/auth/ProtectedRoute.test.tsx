import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ProtectedRoute } from './ProtectedRoute'
import { useAuth } from './auth-context'

vi.mock('./auth-context', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)

function renderProtectedRoute(allowed = ['internal_owner'] as const) {
  return render(
    <MemoryRouter initialEntries={['/app']}>
      <Routes>
        <Route path="/login" element={<div>Tela de acesso</div>} />
        <Route element={<ProtectedRoute allowed={[...allowed]} />}>
          <Route path="/app" element={<div>Conteúdo protegido</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('redireciona uma sessão anônima para o login', () => {
    mockedUseAuth.mockReturnValue({
      session: null,
      status: 'unauthenticated',
      accessStatus: 'idle',
      accessContext: null,
      signIn: vi.fn(),
      signUpAcademy: vi.fn(),
      signOut: vi.fn(),
      retryAccessResolution: vi.fn(),
    })

    renderProtectedRoute()
    expect(screen.getByText('Tela de acesso')).toBeInTheDocument()
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument()
  })

  it('mantém o conteúdo oculto enquanto a sessão é verificada', () => {
    mockedUseAuth.mockReturnValue({
      session: null,
      status: 'loading',
      accessStatus: 'idle',
      accessContext: null,
      signIn: vi.fn(),
      signUpAcademy: vi.fn(),
      signOut: vi.fn(),
      retryAccessResolution: vi.fn(),
    })

    renderProtectedRoute()
    expect(screen.getByText('Validando seu ambiente de acesso')).toBeInTheDocument()
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument()
  })

  it('não renderiza o shell enquanto o contexto de acesso é resolvido', () => {
    mockedUseAuth.mockReturnValue({
      session: null,
      status: 'authenticated',
      accessStatus: 'loading',
      accessContext: null,
      signIn: vi.fn(),
      signUpAcademy: vi.fn(),
      signOut: vi.fn(),
      retryAccessResolution: vi.fn(),
    })

    renderProtectedRoute()
    expect(screen.getByText('Validando seu ambiente de acesso')).toBeInTheDocument()
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument()
  })

  it('libera owner no ambiente interno', () => {
    mockedUseAuth.mockReturnValue({
      session: null,
      status: 'authenticated',
      accessStatus: 'resolved',
      accessContext: { kind: 'internal_owner', blockingReason: null },
      signIn: vi.fn(),
      signUpAcademy: vi.fn(),
      signOut: vi.fn(),
      retryAccessResolution: vi.fn(),
    })

    renderProtectedRoute()
    expect(screen.getByText('Conteúdo protegido')).toBeInTheDocument()
  })

  it('bloqueia academy_user tentando acessar o ambiente interno', () => {
    mockedUseAuth.mockReturnValue({
      session: null,
      status: 'authenticated',
      accessStatus: 'resolved',
      accessContext: { kind: 'academy_active', blockingReason: null },
      signIn: vi.fn(),
      signUpAcademy: vi.fn(),
      signOut: vi.fn(),
      retryAccessResolution: vi.fn(),
    })

    renderProtectedRoute()
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument()
  })

  it('mostra erro seguro e não libera conteúdo quando a resolução falha', () => {
    mockedUseAuth.mockReturnValue({
      session: null,
      status: 'authenticated',
      accessStatus: 'error',
      accessContext: null,
      signIn: vi.fn(),
      signUpAcademy: vi.fn(),
      signOut: vi.fn(),
      retryAccessResolution: vi.fn(),
    })

    renderProtectedRoute()
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível validar sua conta')
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument()
  })
})
