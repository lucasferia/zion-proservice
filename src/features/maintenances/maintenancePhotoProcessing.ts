import {
  MAINTENANCE_PHOTO_FINAL_MAX_BYTES,
  MAINTENANCE_PHOTO_MAX_DIMENSION,
} from './maintenancePhotoTypes'
import { validateMaintenancePhoto } from './maintenancePhotoValidation'

const WEBP_QUALITIES = [0.75, 0.65, 0.55, 0.45, 0.35, 0.25] as const
const DIMENSION_SCALES = [1, 0.85, 0.7, 0.55, 0.4] as const

export type DecodedPhoto = {
  width: number
  height: number
  draw: (context: CanvasRenderingContext2D, width: number, height: number) => void
  close: () => void
}

export type PhotoProcessingDependencies = {
  decode: (file: File) => Promise<DecodedPhoto>
  encode: (
    photo: DecodedPhoto,
    width: number,
    height: number,
    quality: number,
  ) => Promise<Blob | null>
}

export function containedPhotoDimensions(width: number, height: number, maximum: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Não foi possível identificar as dimensões da imagem.')
  }

  const scale = Math.min(1, maximum / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

async function decodeInBrowser(file: File): Promise<DecodedPhoto> {
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (context, width, height) => context.drawImage(bitmap, 0, 0, width, height),
      close: () => bitmap.close(),
    }
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = objectUrl
    await image.decode()
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw: (context, width, height) => context.drawImage(image, 0, 0, width, height),
      close: () => URL.revokeObjectURL(objectUrl),
    }
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }
}

async function encodeInBrowser(
  photo: DecodedPhoto,
  width: number,
  height: number,
  quality: number,
) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('O navegador não conseguiu preparar a imagem.')

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  photo.draw(context, width, height)

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/webp', quality)
  })
}

const browserDependencies: PhotoProcessingDependencies = {
  decode: decodeInBrowser,
  encode: encodeInBrowser,
}

function webpFileName(originalName: string) {
  const baseName = originalName.replace(/\.[^.]+$/, '').trim() || 'foto'
  const safeName = baseName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'foto'
  return `${safeName}.webp`
}

export async function prepareMaintenancePhoto(
  file: File,
  dependencies: PhotoProcessingDependencies = browserDependencies,
) {
  const validationError = validateMaintenancePhoto(file)
  if (validationError) throw new Error(validationError)

  let photo: DecodedPhoto
  try {
    photo = await dependencies.decode(file)
  } catch {
    throw new Error('Não foi possível abrir esta imagem. Escolha outra foto da galeria ou da câmera.')
  }

  try {
    const contained = containedPhotoDimensions(
      photo.width,
      photo.height,
      MAINTENANCE_PHOTO_MAX_DIMENSION,
    )

    for (const scale of DIMENSION_SCALES) {
      const width = Math.max(1, Math.round(contained.width * scale))
      const height = Math.max(1, Math.round(contained.height * scale))

      for (const quality of WEBP_QUALITIES) {
        const blob = await dependencies.encode(photo, width, height, quality)
        if (!blob || blob.size <= 0 || blob.type !== 'image/webp') continue
        if (blob.size <= MAINTENANCE_PHOTO_FINAL_MAX_BYTES) {
          return new File([blob], webpFileName(file.name), {
            type: 'image/webp',
            lastModified: Date.now(),
          })
        }
      }
    }
  } finally {
    photo.close()
  }

  throw new Error('Não foi possível reduzir a imagem para até 1 MB. Escolha outra foto.')
}
