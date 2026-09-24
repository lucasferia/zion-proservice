import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useAuth, type AccessContextKind } from '../features/auth/auth-context'
import { AppShell } from './AppShell'

vi.mock('../features/auth/auth-context', async (importOriginal) => {
  const original = await importOriginal<typeof import('../features/auth/auth-context')>()
  return { ...original, useAuth: vi.fn() }
})
const mockedUseAuth = vi.mocked(useAuth)

function renderShell(kind: AccessContextKind) {
  mockedUseAuth.mockReturnValue({
    session: null,
    status: 'authenticated',
    accessStatus: 'resolved',
    accessContext: { kind, blockingReason: null },
    signIn: vi.fn(), signUpAcademy: vi.fn(), signOut: vi.fn(), retryAccessResolution: vi.fn(),
  })
  render(<MemoryRouter initialEntries={['/app']}><Routes><Route path="/app" element={<AppShell />}><Route index element={<div>Início</div>} /></Route></Routes></MemoryRouter>)
}

describe('AppShell e Portal das Academias', () => {
  it('exibe a navegação administrativa somente para owner', () => {
    renderShell('internal_owner')
    expect(screen.getAllByText('Portal das Academias').length).toBeGreaterThan(0)
    expect(screen.getByText('Portal')).toBeInTheDocument()
  })

  it('não mostra a navegação administrativa para technician', () => {
    renderShell('internal_technician')
    expect(screen.queryByText('Portal das Academias')).not.toBeInTheDocument()
    expect(screen.queryByText('Portal')).not.toBeInTheDocument()
  })
})
