import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSupabaseClient } from '../../lib/supabase'
import { approveInternalMaintenanceRequest, convertInternalMaintenanceRequest, createPortalMaintenanceRequest, listPortalMaintenanceRequests, rejectInternalMaintenanceRequest } from './maintenanceRequestApi'

vi.mock('../../lib/supabase', () => ({ getSupabaseClient: vi.fn() }))

describe('contrato do backend de solicitações', () => {
  const rpc = vi.fn()
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSupabaseClient).mockReturnValue({ rpc } as never)
  })

  it('envia somente unidade, equipamento e conteúdo; tenant/autoria/status ficam no backend', async () => {
    rpc.mockResolvedValue({ data: 'request-a', error: null })
    await createPortalMaintenanceRequest('unit-a', { equipmentId: 'equipment-a', title: 'Ruído na esteira', description: 'Ruído contínuo durante o uso.', criticality: 'high', submissionKey: '11111111-1111-4111-8111-111111111111' })
    expect(rpc).toHaveBeenCalledWith('portal_create_maintenance_request', expect.not.objectContaining({ organization_id: expect.anything(), requested_by: expect.anything(), status: expect.anything() }))
  })

  it('trata lista vazia de forma previsível', async () => {
    rpc.mockResolvedValue({ data: [], error: null })
    await expect(listPortalMaintenanceRequests('unit-a', '', { status: '', criticality: '' }, 1)).resolves.toEqual({ items: [], total: 0, pageCount: 1 })
  })
  it('não envia ator, tenant derivado ou vínculos comerciais nas decisões', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    await approveInternalMaintenanceRequest('org-a', 'request-a', { priority: 'high', publicResponse: 'Atendimento aprovado.', internalNote: 'Planejar rota.' })
    expect(rpc).toHaveBeenCalledWith('internal_approve_maintenance_request', expect.not.objectContaining({ decided_by: expect.anything(), status: expect.anything(), client_id: expect.anything() }))
    await rejectInternalMaintenanceRequest('org-a', 'request-b', { publicResponse: 'Equipamento fora do contrato.', internalNote: '' })
    expect(rpc).toHaveBeenCalledWith('internal_reject_maintenance_request', expect.objectContaining({ response_to_academy: 'Equipamento fora do contrato.' }))
  })

  it('converte enviando apenas os campos operacionais não deriváveis', async () => {
    rpc.mockResolvedValue({ data: [{ maintenance_id: 'os-a', work_order_number: 'OS-123' }], error: null })
    await expect(convertInternalMaintenanceRequest('org-a', 'request-a', { maintenanceType: 'corrective', scheduledAt: '2026-10-01T09:30', responsibleTechnicianId: 'tech-a' })).resolves.toEqual({ maintenance_id: 'os-a', work_order_number: 'OS-123' })
    expect(rpc).toHaveBeenCalledWith('internal_convert_maintenance_request', expect.not.objectContaining({ client_id: expect.anything(), equipment_id: expect.anything(), diagnosis: expect.anything(), total_amount: expect.anything() }))
  })
})
