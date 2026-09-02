import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MaintenancePhotoSection } from './MaintenancePhotoSection'
import { uploadMaintenancePhoto } from './maintenancePhotoApi'
import { useMaintenancePhotos } from './maintenancePhotoQueries'
import type { MaintenancePhoto } from './maintenancePhotoTypes'

vi.mock('./maintenancePhotoQueries', () => ({ useMaintenancePhotos: vi.fn() }))
vi.mock('./maintenancePhotoApi', () => ({
  uploadMaintenancePhoto: vi.fn(),
  removeMaintenancePhoto: vi.fn(),
  reorderMaintenancePhotos: vi.fn(),
}))

const photo: MaintenancePhoto = {
  id: 'photo-1',
  organization_id: 'org-1',
  maintenance_id: 'maintenance-1',
  kind: 'before',
  bucket_id: 'maintenance-photos',
  storage_path: 'org-1/maintenance-1/before/photo.jpg',
  mime_type: 'image/jpeg',
  file_size: 1024,
  sort_order: 0,
  created_at: '2026-08-31T12:00:00Z',
  created_by: 'user-1',
  signed_url: 'https://signed.example/photo',
}

function mockQuery(data: MaintenancePhoto[] = []) {
  vi.mocked(useMaintenancePhotos).mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<typeof useMaintenancePhotos>)
}

describe('MaintenancePhotoSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQuery()
  })

  it('mostra os estados vazios e controles de envio em manutenção aberta', () => {
    render(<MaintenancePhotoSection organizationId="org-1" maintenanceId="maintenance-1" status="draft" />)

    expect(screen.getByText('Nenhuma foto antes')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma foto depois')).toBeInTheDocument()
    expect(screen.getByLabelText('Adicionar fotos Antes')).toBeInTheDocument()
    expect(screen.getByLabelText('Adicionar fotos Depois')).toBeInTheDocument()
  })

  it('mantém fotos encerradas visíveis e sem ações de mutação', () => {
    mockQuery([photo])
    render(<MaintenancePhotoSection organizationId="org-1" maintenanceId="maintenance-1" status="completed" />)

    expect(screen.getByRole('img', { name: 'Foto antes 1 da manutenção' })).toHaveAttribute('src', photo.signed_url)
    expect(screen.getByText(/apenas para consulta/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Adicionar fotos Antes')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remover foto/ })).not.toBeInTheDocument()
  })

  it('recusa formato inválido antes de iniciar o upload', async () => {
    render(<MaintenancePhotoSection organizationId="org-1" maintenanceId="maintenance-1" status="in_progress" />)
    const input = screen.getByLabelText('Adicionar fotos Antes')

    fireEvent.change(input, { target: { files: [new File(['gif'], 'evidencia.gif', { type: 'image/gif' })] } })

    expect(await screen.findByText(/evidencia.gif: Use uma imagem JPEG/)).toBeInTheDocument()
    expect(uploadMaintenancePhoto).not.toHaveBeenCalled()
  })

  it('abre e fecha a visualização ampliada', async () => {
    const user = userEvent.setup()
    mockQuery([photo])
    render(<MaintenancePhotoSection organizationId="org-1" maintenanceId="maintenance-1" status="draft" />)

    await user.click(screen.getByRole('button', { name: 'Ampliar foto Antes 1' }))
    expect(screen.getByRole('dialog', { name: 'Visualização ampliada da foto' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fechar visualização' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ampliar foto Antes 1' })).toHaveFocus()
  })
})
