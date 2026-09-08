import { describe, expect, it } from 'vitest'
import { MAINTENANCE_PHOTO_SOURCE_MAX_BYTES } from './maintenancePhotoTypes'
import { maintenancePhotoExtension, validateMaintenancePhoto } from './maintenancePhotoValidation'

describe('validateMaintenancePhoto', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('aceita %s dentro do limite', (type) => {
    expect(validateMaintenancePhoto({ type, size: MAINTENANCE_PHOTO_SOURCE_MAX_BYTES })).toBeNull()
  })

  it('aceita aliases e MIME ausente de provedores de arquivo mobile quando a extensão é segura', () => {
    expect(validateMaintenancePhoto({ type: 'image/jpg', size: 100, name: 'camera.jpg' })).toBeNull()
    expect(validateMaintenancePhoto({ type: '', size: 100, name: 'galeria.JPEG' })).toBeNull()
    expect(validateMaintenancePhoto({ type: 'application/octet-stream', size: 100, name: 'foto.webp' })).toBeNull()
  })

  it('aceita HEIC e HEIF como formatos de origem do iPhone', () => {
    expect(validateMaintenancePhoto({ type: 'image/heic', size: 100, name: 'IMG_0001.HEIC' })).toBeNull()
    expect(validateMaintenancePhoto({ type: '', size: 100, name: 'IMG_0002.HEIF' })).toBeNull()
    expect(validateMaintenancePhoto({ type: 'image/heic-sequence', size: 100, name: 'burst.heic' })).toBeNull()
  })

  it('recusa tipo não permitido', () => {
    expect(validateMaintenancePhoto({ type: 'image/gif', size: 100 })).toMatch(/JPEG, PNG, WebP, HEIC ou HEIF/)
  })

  it('recusa arquivo vazio e origem maior que 15 MB', () => {
    expect(validateMaintenancePhoto({ type: 'image/png', size: 0 })).toMatch(/vazio/)
    expect(validateMaintenancePhoto({ type: 'image/png', size: MAINTENANCE_PHOTO_SOURCE_MAX_BYTES + 1 })).toMatch(/15 MB/)
  })

  it('deriva apenas extensões aprovadas do MIME', () => {
    expect(maintenancePhotoExtension('image/webp')).toBe('webp')
    expect(maintenancePhotoExtension('image/jpeg')).toBe('jpg')
    expect(() => maintenancePhotoExtension('image/gif')).toThrow(/JPEG ou WebP/)
  })
})
