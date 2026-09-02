import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MaintenancePrintableDocument } from './MaintenancePrintPage'
import type { MaintenancePrintRecord } from './types'

const record: MaintenancePrintRecord = {
  organization_name: 'Zion Assistência Técnica',
  maintenance: {
    id: 'maintenance-1',
    organization_id: 'org-1',
    work_order_number: 'OS-2026-001',
    maintenance_type: 'corrective',
    status: 'completed',
    scheduled_at: '2026-08-31T13:00:00Z',
    total_amount: 500,
    client_id: 'client-1',
    client_name: 'Academia Horizonte',
    client_location_id: 'location-1',
    location_name: 'Unidade Centro',
    equipment_id: 'equipment-1',
    equipment_name: 'Esteira 01',
    responsible_technician_id: 'user-1',
    technician_name: 'Técnico Zion',
    part_count: 1,
    completed_at: '2026-08-31T15:00:00Z',
    created_at: '2026-08-31T12:00:00Z',
    updated_at: '2026-08-31T15:00:00Z',
    diagnosis: 'Correia desgastada.',
    service_performed: 'Troca e regulagem da correia.',
    notes: null,
    cancellation_reason: null,
    cancelled_at: null,
    cancelled_by: null,
    completed_by: 'user-1',
    parts: [{
      id: 'part-1',
      organization_id: 'org-1',
      maintenance_id: 'maintenance-1',
      inventory_item_id: 'item-1',
      quantity: 2,
      unit_cost_snapshot: 40,
      total_cost_snapshot: 80,
      inventory_movement_id: 'movement-1',
      created_at: '2026-08-31T15:00:00Z',
      updated_at: '2026-08-31T15:00:00Z',
      item_name: 'Correia',
      item_sku: 'COR-01',
      unit_of_measure: 'un',
      available_quantity: 8,
      current_average_cost: 45,
    }],
  },
  payment_summary: {
    maintenance_total: 500,
    active_total: 300,
    received_total: 200,
    pending_total: 100,
    balance_amount: 300,
  },
  payments: [{
    id: 'payment-1',
    organization_id: 'org-1',
    client_id: 'client-1',
    maintenance_id: 'maintenance-1',
    amount: 200,
    method: 'pix',
    status: 'received',
    paid_at: '2026-08-31T16:00:00Z',
    due_date: null,
    notes: null,
    created_at: '2026-08-31T16:00:00Z',
    created_by: 'user-1',
    cancelled_at: null,
    cancelled_by: null,
    cancellation_reason: null,
  }, {
    id: 'payment-2',
    organization_id: 'org-1',
    client_id: 'client-1',
    maintenance_id: 'maintenance-1',
    amount: 50,
    method: 'cash',
    status: 'cancelled',
    paid_at: null,
    due_date: null,
    notes: null,
    created_at: '2026-08-31T16:30:00Z',
    created_by: 'user-1',
    cancelled_at: '2026-08-31T17:00:00Z',
    cancelled_by: 'user-1',
    cancellation_reason: 'Lançamento duplicado',
  }],
  photos: [{
    id: 'photo-1',
    organization_id: 'org-1',
    maintenance_id: 'maintenance-1',
    kind: 'before',
    bucket_id: 'maintenance-photos',
    storage_path: 'org-1/maintenance-1/before/photo.jpg',
    mime_type: 'image/jpeg',
    file_size: 1024,
    sort_order: 0,
    created_at: '2026-08-31T12:30:00Z',
    created_by: 'user-1',
    signed_url: 'https://signed.example/photo',
  }],
  scheduled_return: {
    id: 'return-1',
    scheduled_date: '2026-09-30',
    status: 'pending',
    notes: 'Revisar tensão da correia.',
    completed_at: null,
    cancelled_at: null,
    cancellation_reason: null,
  },
}

describe('MaintenancePrintableDocument', () => {
  it('reúne serviço, snapshots, pagamento parcial, retorno e foto privada', () => {
    const onPhotoSettled = vi.fn()
    render(<MaintenancePrintableDocument record={record} onPhotoSettled={onPhotoSettled} />)

    expect(screen.getByRole('heading', { level: 1, name: 'OS-2026-001' })).toBeInTheDocument()
    expect(screen.getByText('Troca e regulagem da correia.')).toBeInTheDocument()

    const parts = screen.getByRole('table', { name: 'Peças registradas na ordem de serviço' })
    expect(within(parts).getByText('Correia')).toBeInTheDocument()
    expect(screen.getByText('R$ 300,00')).toBeInTheDocument()
    expect(screen.getByText('Lançamento duplicado')).toBeInTheDocument()
    expect(screen.getByText('Revisar tensão da correia.')).toBeInTheDocument()

    const photo = screen.getByRole('img', { name: 'Foto antes 1 da manutenção' })
    expect(photo).toHaveAttribute('src', 'https://signed.example/photo')
    photo.dispatchEvent(new Event('load'))
    expect(onPhotoSettled).toHaveBeenCalledWith('photo-1')
  })
})
