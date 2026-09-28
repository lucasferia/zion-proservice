import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSupabaseClient } from '../../lib/supabase'
import { PortalAuthorizationError } from '../portal/portalApi'
import { createPortalEquipment, listPortalEquipment } from './portalEquipmentApi'

vi.mock('../../lib/supabase', () => ({ getSupabaseClient: vi.fn() }))
const mockedClient = vi.mocked(getSupabaseClient)
const rpc = vi.fn()

describe('portalEquipmentApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedClient.mockReturnValue({ rpc } as never)
  })

  it('envia ao cadastro somente a unidade e os campos permitidos', async () => {
    rpc.mockResolvedValue({ data: 'equipment-id', error: null })
    await createPortalEquipment('unit-id', {
      name: 'Esteira', category: 'Cardio', brand: 'Zion', model: '',
      serial_number: '', asset_tag: 'PAT-1', notes: '',
    })
    expect(rpc).toHaveBeenCalledWith('portal_create_equipment', {
      target_client_location_id: 'unit-id', equipment_name: 'Esteira', equipment_category: 'Cardio',
      equipment_brand: 'Zion', equipment_model: null, equipment_serial_number: null,
      equipment_asset_tag: 'PAT-1', equipment_notes: null,
    })
    expect(JSON.stringify(rpc.mock.calls[0])).not.toMatch(/organization_id|client_id|created_by|created_source/)
  })

  it('calcula paginação e converte revogação em erro de autorização', async () => {
    rpc.mockResolvedValueOnce({ data: [{ id: 'a', total_count: 13 }], error: null })
    await expect(listPortalEquipment('unit-id', '', 1)).resolves.toMatchObject({ total: 13, pageCount: 2 })
    rpc.mockResolvedValueOnce({ data: null, error: { code: '42501' } })
    await expect(listPortalEquipment('unit-id', '', 1)).rejects.toBeInstanceOf(PortalAuthorizationError)
  })
})
