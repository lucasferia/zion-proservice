import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSupabaseClient } from '../../lib/supabase'
import { createPortalMaintenanceRequest, listPortalMaintenanceRequests } from './maintenanceRequestApi'

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
})
