import { describe, expect, it, vi } from 'vitest'
import { MAINTENANCE_PHOTO_SOURCE_MAX_BYTES } from './maintenancePhotoTypes'
import {
  containedPhotoDimensions,
  prepareMaintenancePhoto,
  type DecodedPhoto,
  type PhotoProcessingDependencies,
} from './maintenancePhotoProcessing'

function decoded(width = 4000, height = 3000): DecodedPhoto {
  return { width, height, draw: vi.fn(), close: vi.fn() }
}

describe('prepareMaintenancePhoto', () => {
  it('respeita 1600 px, inicia em qualidade 0,75 e reduz até ficar abaixo de 1 MB', async () => {
    const photo = decoded()
    const encode = vi.fn()
      .mockResolvedValueOnce(new Blob([new Uint8Array(1_100_000)], { type: 'image/webp' }))
      .mockResolvedValueOnce(new Blob([new Uint8Array(800_000)], { type: 'image/webp' }))
    const dependencies: PhotoProcessingDependencies = {
      decode: vi.fn().mockResolvedValue(photo),
      encode,
    }

    const result = await prepareMaintenancePhoto(
      new File(['jpeg'], 'Foto visita.JPG', { type: 'image/jpeg' }),
      dependencies,
    )

    expect(encode).toHaveBeenNthCalledWith(1, photo, 1600, 1200, 0.75)
    expect(encode).toHaveBeenNthCalledWith(2, photo, 1600, 1200, 0.65)
    expect(result.type).toBe('image/webp')
    expect(result.name).toBe('Foto-visita.webp')
    expect(result.size).toBe(800_000)
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
    )).rejects.toThrow(/reduzir a imagem/)
    expect(photo.close).toHaveBeenCalledOnce()
  })
})
