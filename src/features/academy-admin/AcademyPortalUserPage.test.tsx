import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAcademyAdminMutations, useAcademyAdminUser } from './academyAdminQueries'
import { AcademyPortalUserPage } from './AcademyPortalUserPage'
import type { AcademyAdminUserDetails } from './types'

vi.mock('./academyAdminQueries', () => ({ useAcademyAdminUser: vi.fn(), useAcademyAdminMutations: vi.fn() }))
const mockedUser = vi.mocked(useAcademyAdminUser)
const mockedMutations = vi.mocked(useAcademyAdminMutations)

const pendingUser: AcademyAdminUserDetails = {
  userId: 'user-a', fullName: 'Gestora Teste', email: 'gestora@test.local', emailConfirmed: true,
  authDisabled: true, status: 'pending', organizationId: null, createdAt: '2026-09-23T10:00:00Z',
  updatedAt: '2026-09-23T10:00:00Z', statusChangedAt: null, statusChangeReason: null,
  client: null, commercial: null, locations: [], auditEvents: [],
}

const activeUser: AcademyAdminUserDetails = {
  ...pendingUser, status: 'active', organizationId: 'org-a', authDisabled: false,
  client: { id: 'client-a', name: 'Academia Norte', archived: false },
  commercial: { status: 'active', updatedAt: '2026-09-23T10:00:00Z', reason: 'Contrato ativo', affectedUsers: 2 },
  locations: [{ id: 'location-a', clientId: 'client-a', name: 'Centro', city: 'São Paulo', status: 'active', archived: false, grantedAt: '2026-09-23T10:00:00Z', grantedByName: 'Lucas', revokedAt: null, revokedByName: null, revocationReason: null }],
}

function queryState<T>(data: T) {
  return { data, isLoading: false, error: null, refetch: vi.fn() }
}

function mutation(mutateAsync = vi.fn().mockResolvedValue(undefined)) {
  return { mutateAsync, isPending: false, error: null, reset: vi.fn() }
}

function setup(details: AcademyAdminUserDetails, overrides: { changeStatus?: ReturnType<typeof mutation> } = {}) {
  const configure = mutation()
  const changeStatus = overrides.changeStatus ?? mutation()
  const replaceLocations = mutation()
  const changeCommercial = mutation(vi.fn().mockResolvedValue(2))
  mockedUser.mockReturnValue({
    details: queryState(details),
    options: queryState([
      { client_id: 'client-a', client_name: 'Academia Norte', client_location_id: 'location-a', client_location_name: 'Centro', city: 'São Paulo' },
      { client_id: 'client-a', client_name: 'Academia Norte', client_location_id: 'location-b', client_location_name: 'Sul', city: 'São Paulo' },
    ]),
  } as unknown as ReturnType<typeof useAcademyAdminUser>)
  mockedMutations.mockReturnValue({ configure, changeStatus, replaceLocations, changeCommercial } as unknown as ReturnType<typeof useAcademyAdminMutations>)
  render(<MemoryRouter initialEntries={['/app/portal-academias/user-a']}><Routes><Route path="/app/portal-academias/:userId" element={<AcademyPortalUserPage />} /></Routes></MemoryRouter>)
  return { configure, changeStatus, replaceLocations, changeCommercial }
}

describe('AcademyPortalUserPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('revisa e confirma configuração inicial com múltiplas unidades', async () => {
    const user = userEvent.setup()
    const { configure } = setup(pendingUser)
    expect(screen.getByText('Identidade desativada no Supabase Auth')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Academia'), 'client-a')
    await user.click(screen.getByLabelText(/Centro/))
    await user.click(screen.getByLabelText(/Sul/))
    await user.selectOptions(screen.getByLabelText('Situação comercial inicial'), 'trialing')
    await user.type(screen.getByLabelText(/Motivo da configuração/), 'Validação concluída')
    await user.click(screen.getByRole('button', { name: /Revisar liberação/ }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Centro, Sul')
    expect(screen.getByRole('dialog')).toHaveTextContent('Período de teste')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Voltar' })).toHaveFocus())
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Confirmar liberação' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Voltar' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Confirmar liberação' }))
    expect(configure.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'client-a', locationIds: ['location-a', 'location-b'], commercialStatus: 'trialing' }))
    expect(await screen.findByRole('status')).toHaveTextContent('configurado e liberado')
  })

  it('avisa o impacto da última unidade, persiste revogação e devolve foco', async () => {
    const user = userEvent.setup()
    const { replaceLocations } = setup(activeUser)
    await user.click(screen.getByLabelText(/Centro/))
    await user.type(screen.getByLabelText(/Motivo da alteração das unidades/), 'Encerramento da unidade')
    const reviewButton = screen.getByRole('button', { name: 'Revisar unidades' })
    await user.click(reviewButton)
    expect(screen.getByRole('dialog')).toHaveTextContent('voltará a aguardar liberação')
    await user.click(screen.getByRole('button', { name: 'Voltar' }))
    await waitFor(() => expect(reviewButton).toHaveFocus())
    await user.click(reviewButton)
    await user.click(screen.getByRole('button', { name: 'Salvar unidades' }))
    expect(replaceLocations.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ locationIds: [] }))
    expect(await screen.findByRole('status')).toHaveTextContent('voltou a aguardar liberação')
  })

  it('suspende somente o usuário e exibe impacto comercial separadamente', async () => {
    const user = userEvent.setup()
    const { changeStatus } = setup(activeUser)
    expect(screen.getByText(/pode afetar 2 usuários ativos/)).toBeInTheDocument()
    await user.type(screen.getByLabelText(/Motivo da suspensão/), 'Solicitação da academia')
    await user.click(screen.getByRole('button', { name: 'Suspender usuário' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Esta pessoa')
    await user.click(screen.getAllByRole('button', { name: 'Suspender usuário' }).at(-1)!)
    expect(changeStatus.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ status: 'suspended', reason: 'Solicitação da academia' }))
  })

  it('exibe erro recuperável e não informa sucesso quando o backend rejeita', async () => {
    const user = userEvent.setup()
    const rejected = vi.fn().mockRejectedValue(new Error('Registro alterado por outro owner'))
    setup(activeUser, { changeStatus: mutation(rejected) })
    await user.type(screen.getByLabelText(/Motivo da suspensão/), 'Suspensão concorrente')
    await user.click(screen.getByRole('button', { name: 'Suspender usuário' }))
    await user.click(screen.getAllByRole('button', { name: 'Suspender usuário' }).at(-1)!)
    expect(await screen.findByRole('alert')).toHaveTextContent('Registro alterado por outro owner')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
