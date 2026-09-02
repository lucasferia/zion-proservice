import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ClientPrintableDocument } from './ClientPrintPage'
import type { ClientPrintRecord } from './types'

const record: ClientPrintRecord = {
  organization_name: 'Zion Assistência Técnica',
  client: {
    id: 'client-12345678',
    organization_id: 'org-1',
    name: 'Academia Horizonte',
    phone: '(11) 99999-0000',
    email: 'contato@horizonte.test',
    document: '00.000.000/0001-00',
    notes: 'Atendimento pela recepção.',
    created_at: '2026-08-10T12:00:00Z',
    updated_at: '2026-08-10T12:00:00Z',
    client_locations: [{
      id: 'location-1',
      organization_id: 'org-1',
      client_id: 'client-12345678',
      name: 'Unidade Centro',
      postal_code: '01001-000',
      street: 'Praça da Sé',
      number: '100',
      complement: null,
      neighborhood: 'Sé',
      city: 'São Paulo',
      state: 'SP',
      notes: null,
      created_at: '2026-08-10T12:00:00Z',
      updated_at: '2026-08-10T12:00:00Z',
    }],
  },
  equipment: [{
    id: 'equipment-1',
    organization_id: 'org-1',
    client_id: 'client-12345678',
    client_location_id: 'location-1',
    name: 'Esteira 01',
    category: 'Cardio',
    brand: 'Zion Fit',
    model: 'Run Pro',
    serial_number: 'SN-001',
    asset_tag: 'PAT-001',
    status: 'operational',
    notes: null,
    created_at: '2026-08-10T12:00:00Z',
    updated_at: '2026-08-10T12:00:00Z',
    client_name: 'Academia Horizonte',
    location_name: 'Unidade Centro',
    location_city: 'São Paulo',
  }],
}

describe('ClientPrintableDocument', () => {
  it('compõe a ficha A4 com cadastro, unidade e equipamentos do registro isolado', () => {
    render(<ClientPrintableDocument record={record} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Academia Horizonte' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Unidade Centro' })).toBeInTheDocument()
    expect(screen.getByText(/Praça da Sé, 100/)).toBeInTheDocument()

    const table = screen.getByRole('table', { name: 'Equipamentos vinculados ao cliente' })
    expect(within(table).getByText('Esteira 01')).toBeInTheDocument()
    expect(within(table).getByText('Operacional')).toBeInTheDocument()
    expect(screen.queryByText('Cliente de outra organização')).not.toBeInTheDocument()
  })
})
