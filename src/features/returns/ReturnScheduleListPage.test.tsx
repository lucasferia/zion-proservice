import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { DayAgenda } from './ReturnScheduleListPage'

describe('DayAgenda', () => {
  it('mostra estado vazio claro no dia sem compromissos', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter><DayAgenda items={[]} organizationId="org-a" canManageEvents onSuccess={() => undefined} /></MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByText('Agenda livre')).toBeInTheDocument()
    expect(screen.getByText(/Nenhum compromisso/i)).toBeInTheDocument()
  })
})
