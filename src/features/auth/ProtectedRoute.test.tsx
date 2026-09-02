import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ProtectedRoute } from './ProtectedRoute'
import { useAuth } from './auth-context'

vi.mock('./auth-context', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={['/app']}>
      <Routes>
        <Route path="/login" element={<div>Tela de acesso</div>} />
        <Route element={<ProtectedRoute />}>
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
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    renderProtectedRoute()
    expect(screen.getByText('Tela de acesso')).toBeInTheDocument()
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument()
  })

  it('mantém o conteúdo oculto enquanto a sessão é verificada', () => {
    mockedUseAuth.mockReturnValue({
      session: null,
      status: 'loading',
      signIn: vi.fn(),
      signOut: vi.fn(),
    })

    renderProtectedRoute()
    expect(screen.getByText('Verificando sua sessão')).toBeInTheDocument()
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument()
  })
})
