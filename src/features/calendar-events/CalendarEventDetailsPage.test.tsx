import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CalendarEventDetailsPage } from './CalendarEventDetailsPage'
import type { CalendarEvent, CalendarEventOptions } from './types'

const mocks = vi.hoisted(() => ({
  complete: vi.fn(), cancel: vi.fn(), archive: vi.fn(), hook: vi.fn(),
}))

vi.mock('./calendarEventApi', () => ({
  completeCalendarEvent: mocks.complete,
  cancelCalendarEvent: mocks.cancel,
  archiveCalendarEvent: mocks.archive,
}))

vi.mock('./calendarEventQueries', () => ({
  calendarEventKeys: { all: ['calendar-events'] },
  useCalendarEventDetails: mocks.hook,
}))

const event = {
  id: 'event-a', organization_id: 'org-a', title: 'Visita externa', description: 'Revisar instalação',
  event_type: 'technical_visit', status: 'scheduled', is_all_day: true, event_date: '2026-09-22',
  starts_at: null, ends_at: null, client_id: null, client_name: null, client_location_id: null,
  location_name: null, location_city: null, equipment_id: null, equipment_name: null,
  maintenance_id: null, work_order_number: null, created_at: '2026-09-20T12:00:00Z', created_by: 'user-a',
  updated_at: '2026-09-20T12:00:00Z', updated_by: 'user-a', completed_at: null, completed_by: null,
  cancelled_at: null, cancelled_by: null, cancellation_reason: null,
} satisfies CalendarEvent

const options = {
  canManage: true, clients: [], locations: [], equipment: [], maintenances: [], cities: [],
} satisfies CalendarEventOptions

function hookValue(overrides?: Partial<CalendarEvent>) {
  return {
    organization: { data: 'org-a', isLoading: false, error: null },
    event: { data: { ...event, ...overrides }, isLoading: false, error: null },
    options: { data: options, isLoading: false, error: null },
  }
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined)
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/app/agenda/eventos/event-a']}>
        <Routes><Route path="/app/agenda/eventos/:eventId" element={<CalendarEventDetailsPage />} /><Route path="/app/agenda" element={<div>Agenda</div>} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CalendarEventDetailsPage actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.hook.mockReturnValue(hookValue())
    mocks.complete.mockResolvedValue(undefined)
    mocks.cancel.mockResolvedValue(undefined)
    mocks.archive.mockResolvedValue(undefined)
  })

  it('confirma a conclusão antes de chamar a RPC', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Concluir' }))
    expect(mocks.complete).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /Confirmar conclusão/ }))
    expect(mocks.complete).toHaveBeenCalledWith('org-a', 'event-a')
  })

  it('valida e envia o motivo do cancelamento', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: /Confirmar cancelamento/ }))
    expect(screen.getByText(/pelo menos 3 caracteres/i)).toBeInTheDocument()
    await user.type(screen.getByLabelText(/Motivo do cancelamento/), 'Cliente desmarcou')
    await user.click(screen.getByRole('button', { name: /Confirmar cancelamento/ }))
    expect(mocks.cancel).toHaveBeenCalledWith('org-a', 'event-a', 'Cliente desmarcou')
  })

  it('explica e confirma a exclusão lógica', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Excluir evento' }))
    expect(screen.getByText(/continuará preservado no banco/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Excluir da agenda' }))
    expect(mocks.archive).toHaveBeenCalledWith('org-a', 'event-a')
    expect(await screen.findByText('Agenda')).toBeInTheDocument()
  })

  it('oculta ações administrativas para technician', () => {
    mocks.hook.mockReturnValue({ ...hookValue(), options: { data: { ...options, canManage: false }, isLoading: false, error: null } })
    renderPage()
    expect(screen.getByText(/acesso somente para leitura/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Concluir' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Excluir evento' })).not.toBeInTheDocument()
  })

  it('expõe estados de loading e erro', () => {
    mocks.hook.mockReturnValue({
      organization: { data: undefined, isLoading: true, error: null },
      event: { data: undefined, isLoading: false, error: null },
      options: { data: undefined, isLoading: false, error: null },
    })
    const loading = renderPage()
    expect(screen.getByLabelText(/Carregando/i)).toHaveAttribute('aria-busy', 'true')
    loading.unmount()
    mocks.hook.mockReturnValue({
      organization: { data: 'org-a', isLoading: false, error: null },
      event: { data: undefined, isLoading: false, error: new Error('Falha controlada') },
      options: { data: options, isLoading: false, error: null },
    })
    renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent('Falha controlada')
  })
})
