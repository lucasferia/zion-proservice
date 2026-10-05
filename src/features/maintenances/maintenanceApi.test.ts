import { describe, expect, it } from 'vitest'
import { maintenanceToInput } from './maintenanceApi'
import type { MaintenanceDetails } from './types'

describe('maintenanceToInput', () => {
  it('reabre a OS preservando tipo e valor informado do desconto', () => {
    const details = {
      id: 'maintenance-a',
      organization_id: 'organization-a',
      work_order_number: 'OS-001',
      maintenance_type: 'corrective',
      status: 'draft',
      scheduled_at: '2026-10-05T12:00:00Z',
      next_return_date: '2026-11-05',
      total_amount: 850,
      labor_amount: 1000,
      discount_type: 'fixed',
      discount_value: 150,
      discount_amount: 150,
      client_id: 'client-a',
      client_name: 'Academia A',
      client_location_id: null,
      location_name: null,
      equipment_id: 'equipment-a',
      equipment_name: 'Esteira A',
      responsible_technician_id: 'user-a',
      technician_name: 'Técnico A',
      part_count: 0,
      completed_at: null,
      created_at: '2026-10-05T11:00:00Z',
      updated_at: '2026-10-05T11:00:00Z',
      diagnosis: null,
      service_performed: null,
      notes: null,
      cancellation_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      completed_by: null,
      parts: [],
      request_origin: null,
    } satisfies MaintenanceDetails

    expect(maintenanceToInput(details)).toEqual(expect.objectContaining({
      labor_amount: '1000',
      discount_type: 'fixed',
      discount_value: '150',
    }))
  })
})
