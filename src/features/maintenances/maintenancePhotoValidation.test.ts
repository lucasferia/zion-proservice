import { describe, expect, it } from 'vitest'
import { MAINTENANCE_PHOTO_SOURCE_MAX_BYTES } from './maintenancePhotoTypes'
import { maintenancePhotoExtension, validateMaintenancePhoto } from './maintenancePhotoValidation'

describe('validateMaintenancePhoto', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('aceita %s dentro do limite', (type) => {
    expect(validateMaintenancePhoto({ type, size: MAINTENANCE_PHOTO_SOURCE_MAX_BYTES })).toBeNull()
  })

  it('recusa tipo não permitido', () => {
    expect(validateMaintenancePhoto({ type: 'image/gif', size: 100 })).toMatch(/JPEG, PNG ou WebP/)
  })

  it('recusa arquivo vazio e origem maior que 15 MB', () => {
    expect(validateMaintenancePhoto({ type: 'image/png', size: 0 })).toMatch(/vazio/)
    expect(validateMaintenancePhoto({ type: 'image/png', size: MAINTENANCE_PHOTO_SOURCE_MAX_BYTES + 1 })).toMatch(/15 MB/)
  })

  it('deriva apenas extensões aprovadas do MIME', () => {
    expect(maintenancePhotoExtension('image/webp')).toBe('webp')
    expect(() => maintenancePhotoExtension('image/gif')).toThrow(/convertida para WebP/)
  })
})
