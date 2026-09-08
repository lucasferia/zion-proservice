import { describe, expect, it, vi } from 'vitest'
import {
  MAINTENANCE_PHOTO_FINAL_MAX_BYTES,
  MAINTENANCE_PHOTO_SOURCE_MAX_BYTES,
} from './maintenancePhotoTypes'
import {
  containedPhotoDimensions,
  convertHeicSource,
  decodeInBrowser,
  isHeicSource,
  prepareMaintenancePhoto,
  type DecodedPhoto,
  type PhotoProcessingDependencies,
} from './maintenancePhotoProcessing'

function decoded(width = 4000, height = 3000): DecodedPhoto {
  return { width, height, draw: vi.fn(), close: vi.fn() }
}

describe('prepareMaintenancePhoto', () => {
  it('converte para WebP em 1600 px, preserva qualidade e reduz até ficar abaixo de 10 MB', async () => {
    const photo = decoded()
    const encode = vi.fn()
      .mockResolvedValueOnce(new Blob([new Uint8Array(MAINTENANCE_PHOTO_FINAL_MAX_BYTES + 1)], { type: 'image/webp' }))
      .mockResolvedValueOnce(new Blob([new Uint8Array(8_000_000)], { type: 'image/webp' }))
    const dependencies: PhotoProcessingDependencies = {
      decode: vi.fn().mockResolvedValue(photo),
      encode,
    }

    const result = await prepareMaintenancePhoto(
      new File(['jpeg'], 'Foto visita.JPG', { type: 'image/jpeg' }),
      dependencies,
    )

    expect(encode).toHaveBeenNthCalledWith(1, photo, 1600, 1200, 0.85)
    expect(encode).toHaveBeenNthCalledWith(2, photo, 1600, 1200, 0.8)
    expect(result.type).toBe('image/webp')
    expect(result.name).toBe('Foto-visita.webp')
    expect(result.size).toBe(8_000_000)
    expect(photo.close).toHaveBeenCalledOnce()
  })

  it('preserva a proporção em retrato após a orientação aplicada pelo decoder do navegador', () => {
    expect(containedPhotoDimensions(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 })
  })

  it('rejeita origem acima de 15 MB antes de decodificar', async () => {
    const decode = vi.fn()
    await expect(prepareMaintenancePhoto(
      new File([new Uint8Array(MAINTENANCE_PHOTO_SOURCE_MAX_BYTES + 1)], 'grande.png', { type: 'image/png' }),
      { decode, encode: vi.fn() },
    )).rejects.toThrow(/15 MB/)
    expect(decode).not.toHaveBeenCalled()
  })

  it('não aceita fallback de encoder que não produza WebP válido', async () => {
    const photo = decoded(800, 600)
    await expect(prepareMaintenancePhoto(
      new File(['png'], 'foto.png', { type: 'image/png' }),
      {
        decode: vi.fn().mockResolvedValue(photo),
        encode: vi.fn().mockResolvedValue(new Blob(['png'], { type: 'image/png' })),
      },
    )).rejects.toThrow(/conversor WebP não está disponível/)
    expect(photo.close).toHaveBeenCalledOnce()
  })

  it('usa o elemento de imagem quando createImageBitmap falha em um navegador mobile', async () => {
    const originalCreateImageBitmap = window.createImageBitmap
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL
    const originalImage = globalThis.Image
    const createImageBitmap = vi.fn().mockRejectedValue(new Error('não suportado'))
    const revokeObjectURL = vi.fn()

    class MobileImage {
      decoding = ''
      naturalWidth = 3024
      naturalHeight = 4032
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(_value: string) {
        queueMicrotask(() => this.onload?.())
      }
    }

    Object.defineProperty(window, 'createImageBitmap', { configurable: true, value: createImageBitmap })
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:mobile-photo') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    vi.stubGlobal('Image', MobileImage)

    try {
      const result = await decodeInBrowser(new File(['jpeg'], 'camera.jpg', { type: 'image/jpeg' }))
      expect(createImageBitmap).toHaveBeenCalledTimes(2)
      expect(result.width).toBe(3024)
      expect(result.height).toBe(4032)
      result.close()
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mobile-photo')
    } finally {
      Object.defineProperty(window, 'createImageBitmap', { configurable: true, value: originalCreateImageBitmap })
      Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL })
      Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL })
      vi.stubGlobal('Image', originalImage)
    }
  })

  it('converte HEIC para JPEG temporário antes do pipeline WebP', async () => {
    const converter = vi.fn().mockResolvedValue(new Blob(['jpeg'], { type: 'image/jpeg' }))
    const source = new File(['heic'], 'IMG_1024.HEIC', { type: 'image/heic', lastModified: 123 })

    const result = await convertHeicSource(source, converter)

    expect(converter).toHaveBeenCalledWith(source)
    expect(result.name).toBe('IMG_1024.jpg')
    expect(result.type).toBe('image/jpeg')
    expect(result.lastModified).toBe(123)
  })

  it('reconhece HEIC pelo cabeçalho mesmo quando o iPhone informa MIME incorreto', async () => {
    const header = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 104, 101, 105, 99])
    const source = new File([header], 'IMG_1024.jpg', { type: 'image/jpeg' })

    await expect(isHeicSource(source)).resolves.toBe(true)
  })
})
