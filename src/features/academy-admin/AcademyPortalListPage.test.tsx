import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAcademyAdminList } from './academyAdminQueries'
import { AcademyPortalListPage } from './AcademyPortalListPage'

vi.mock('./academyAdminQueries', () => ({ useAcademyAdminList: vi.fn() }))
const mockedList = vi.mocked(useAcademyAdminList)

function queryState<T>(data: T, overrides = {}) {
  return { data, isLoading: false, error: null, refetch: vi.fn(), ...overrides }
}

function mockList(users: unknown[] = []) {
  mockedList.mockReturnValue({
    summary: queryState({ pending_users: 1, active_users: 2, suspended_users: 1, active_academies: 1 }),
    options: queryState([{ client_id: 'client-a', client_name: 'Academia Norte', client_location_id: 'location-a', client_location_name: 'Centro', city: 'São Paulo' }]),
    users: queryState(users),
    deferredSearch: '',
  } as unknown as ReturnType<typeof useAcademyAdminList>)
}

describe('AcademyPortalListPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('exibe indicadores, usuário e filtros administrativos', async () => {
    mockList([{ user_id: 'user-a', full_name: 'Gestora Teste', email: 'gestora@test.local', email_confirmed: true, auth_disabled: false, portal_status: 'pending', organization_id: null, client_id: null, client_name: null, active_location_count: 0, commercial_status: null, created_at: '2026-09-23T10:00:00Z', updated_at: '2026-09-23T10:00:00Z', total_count: 1 }])
    render(<MemoryRouter><AcademyPortalListPage /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Portal das Academias' })).toBeInTheDocument()
    expect(screen.getByText('Gestora Teste')).toBeInTheDocument()
    expect(screen.getAllByText('Aguardando liberação').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Gerenciar' })).toHaveAttribute('href', '/app/portal-academias/user-a')
    expect(document.querySelector('.academy-user-row')).toBeInTheDocument()
  })

  it('encaminha busca e filtros e mostra estado vazio', async () => {
    mockList([])
    const user = userEvent.setup()
    render(<MemoryRouter><AcademyPortalListPage /></MemoryRouter>)
    await user.type(screen.getByRole('searchbox'), 'ana')
    await user.selectOptions(screen.getByLabelText('Status do usuário'), 'suspended')
    await user.selectOptions(screen.getByLabelText('Academia'), 'client-a')
    expect(screen.getByRole('heading', { name: 'Nenhum usuário encontrado' })).toBeInTheDocument()
    expect(mockedList).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'ana', status: 'suspended', clientId: 'client-a' }))
  })

  it('trata loading e erro sem apresentar sucesso falso', () => {
    mockedList.mockReturnValue({
      summary: queryState(undefined, { isLoading: true }),
      options: queryState([]),
      users: queryState(undefined, { error: new Error('Falha segura') }),
      deferredSearch: '',
    } as unknown as ReturnType<typeof useAcademyAdminList>)
    const { rerender } = render(<MemoryRouter><AcademyPortalListPage /></MemoryRouter>)
    expect(screen.getByLabelText('Carregando conteúdo')).toBeInTheDocument()
    mockedList.mockReturnValue({ summary: queryState(undefined), options: queryState([]), users: queryState(undefined, { error: new Error('Falha segura') }), deferredSearch: '' } as unknown as ReturnType<typeof useAcademyAdminList>)
    rerender(<MemoryRouter><AcademyPortalListPage /></MemoryRouter>)
    expect(screen.getByRole('alert')).toHaveTextContent('Falha segura')
  })
})
