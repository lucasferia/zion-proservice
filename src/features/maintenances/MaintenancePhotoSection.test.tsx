import { act, fireEvent, render, screen } from '@testing-library/react'
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
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:preview') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
    mockQuery()
  })

  it('mostra os estados vazios e controles de envio em manutenção aberta', () => {
    render(<MaintenancePhotoSection organizationId="org-1" maintenanceId="maintenance-1" status="draft" />)

    expect(screen.getByText('Nenhuma foto antes')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma foto depois')).toBeInTheDocument()
    const gallery = screen.getByLabelText('Escolher fotos Antes da galeria')
    const camera = screen.getByLabelText('Tirar foto Antes com a câmera')
    expect(gallery).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
    expect(gallery).not.toHaveAttribute('capture')
    expect(gallery).toHaveAttribute('multiple')
    expect(camera).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
    expect(camera).toHaveAttribute('capture', 'environment')
    expect(camera).not.toHaveAttribute('multiple')
    expect(screen.getByLabelText('Escolher fotos Depois da galeria')).toBeInTheDocument()
  })

  it('mantém fotos encerradas visíveis e sem ações de mutação', () => {
    mockQuery([photo])
    render(<MaintenancePhotoSection organizationId="org-1" maintenanceId="maintenance-1" status="completed" />)

    expect(screen.getByRole('img', { name: 'Foto antes 1 da manutenção' })).toHaveAttribute('src', photo.signed_url)
    expect(screen.getByText(/apenas para consulta/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Escolher fotos Antes da galeria')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remover foto/ })).not.toBeInTheDocument()
  })

  it('recusa formato inválido antes de iniciar o upload', async () => {
    render(<MaintenancePhotoSection organizationId="org-1" maintenanceId="maintenance-1" status="in_progress" />)
    const input = screen.getByLabelText('Escolher fotos Antes da galeria')

    fireEvent.change(input, { target: { files: [new File(['gif'], 'evidencia.gif', { type: 'image/gif' })] } })

    expect(await screen.findByText(/evidencia.gif: Use uma imagem JPEG/)).toBeInTheDocument()
    expect(uploadMaintenancePhoto).not.toHaveBeenCalled()
  })

  it('expõe as etapas de preparação e envio no fluxo da galeria', async () => {
    let finishPreparation: () => void = () => {}
    let finishUpload: () => void = () => {}
    const preparation = new Promise<void>((resolve) => { finishPreparation = resolve })
    const upload = new Promise<void>((resolve) => { finishUpload = resolve })
    vi.mocked(uploadMaintenancePhoto).mockImplementation(async (...args) => {
      const onProgress = args[5]
      const onStage = args[6]
      onStage?.('preparing')
      onProgress?.(5)
      await preparation
      onStage?.('uploading')
      onProgress?.(35)
      await upload
      onProgress?.(100)
    })
    render(<MaintenancePhotoSection organizationId="org-1" maintenanceId="maintenance-1" status="draft" />)

    fireEvent.change(screen.getByLabelText('Escolher fotos Antes da galeria'), {
      target: { files: [new File(['jpeg'], 'visita.jpg', { type: 'image/jpeg' })] },
    })
    expect(await screen.findByText(/Preparando imagem/)).toBeInTheDocument()
    await act(async () => finishPreparation())
    expect(await screen.findByText(/Enviando imagem/)).toBeInTheDocument()
    await act(async () => finishUpload())
    expect(await screen.findByText('Foto enviada com segurança.')).toBeInTheDocument()
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
