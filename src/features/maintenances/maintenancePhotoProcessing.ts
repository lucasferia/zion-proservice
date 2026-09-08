import {
  MAINTENANCE_PHOTO_FINAL_MAX_BYTES,
  MAINTENANCE_PHOTO_MAX_DIMENSION,
} from './maintenancePhotoTypes'
import { isHeicPhotoFile, validateMaintenancePhoto } from './maintenancePhotoValidation'

const WEBP_QUALITIES = [0.85, 0.8, 0.75, 0.65, 0.55, 0.45] as const
const JPEG_QUALITIES = [0.85, 0.8, 0.75, 0.65, 0.55, 0.45] as const
const DIMENSION_SCALES = [1, 0.9, 0.8, 0.7, 0.55] as const

type ProcessedPhotoMimeType = 'image/webp' | 'image/jpeg'

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
    mimeType: ProcessedPhotoMimeType,
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

async function decodeWithImageElement(file: File): Promise<DecodedPhoto> {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Falha ao carregar a imagem.'))
      image.src = objectUrl
    })
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

type HeicConverter = (file: File) => Promise<Blob>

async function convertHeicInBrowser(file: File) {
  const { heicTo } = await import('heic-to/csp')
  return heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 })
}

export async function convertHeicSource(
  file: File,
  converter: HeicConverter = convertHeicInBrowser,
) {
  const jpeg = await converter(file)
  if (!jpeg || jpeg.size <= 0 || jpeg.type !== 'image/jpeg') {
    throw new Error('A foto HEIC não pôde ser convertida para um formato compatível.')
  }
  const baseName = file.name.replace(/\.(heic|heif)$/i, '') || 'foto-iphone'
  return new File([jpeg], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified })
}

export async function isHeicSource(file: File) {
  if (isHeicPhotoFile(file)) return true
  const header = new Uint8Array(await file.slice(0, 40).arrayBuffer())
  if (header.length < 12) return false
  const signature = String.fromCharCode(...header)
  return signature.slice(4, 8) === 'ftyp'
    && /heic|heix|hevc|hevx|heim|heis|mif1|msf1/.test(signature.slice(8))
}

export async function decodeInBrowser(file: File): Promise<DecodedPhoto> {
  if (await isHeicSource(file)) {
    const jpeg = await convertHeicSource(file)
    return decodeWithImageElement(jpeg)
  }

  if (typeof window.createImageBitmap === 'function') {
    try {
      let bitmap: ImageBitmap
      try {
        bitmap = await window.createImageBitmap(file, { imageOrientation: 'from-image' })
      } catch {
        bitmap = await window.createImageBitmap(file)
      }
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (context, width, height) => context.drawImage(bitmap, 0, 0, width, height),
        close: () => bitmap.close(),
      }
    } catch {
      // Safari e alguns WebViews expõem createImageBitmap, mas falham com fotos da câmera.
      // O elemento <img> preserva a orientação aplicada pelo próprio navegador.
    }
  }

  return decodeWithImageElement(file)
}

async function encodeInBrowser(
  photo: DecodedPhoto,
  width: number,
  height: number,
  mimeType: ProcessedPhotoMimeType,
  quality: number,
) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('O navegador não conseguiu preparar a imagem.')

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  if (mimeType === 'image/jpeg') {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
  }
  photo.draw(context, width, height)

  return new Promise<Blob | null>((resolve, reject) => {
    if (typeof canvas.toBlob !== 'function') {
      reject(new Error('Conversão de imagem indisponível.'))
      return
    }
    try {
      canvas.toBlob(resolve, mimeType, quality)
    } catch (error) {
      reject(error)
    }
  })
}

const browserDependencies: PhotoProcessingDependencies = {
  decode: decodeInBrowser,
  encode: encodeInBrowser,
}

function processedFileName(originalName: string, mimeType: ProcessedPhotoMimeType) {
  const baseName = originalName.replace(/\.[^.]+$/, '').trim() || 'foto'
  const safeName = baseName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'foto'
  return `${safeName}.${mimeType === 'image/webp' ? 'webp' : 'jpg'}`
}

const OUTPUT_FORMATS = [
  { mimeType: 'image/webp', qualities: WEBP_QUALITIES },
  { mimeType: 'image/jpeg', qualities: JPEG_QUALITIES },
] as const satisfies ReadonlyArray<{
  mimeType: ProcessedPhotoMimeType
  qualities: readonly number[]
}>

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
    if (isHeicPhotoFile(file)) {
      throw new Error('Não foi possível converter esta foto do iPhone. Tente novamente ou escolha outra imagem.')
    }
    throw new Error('Não foi possível abrir esta imagem. Escolha outra foto da galeria ou da câmera.')
  }

  try {
    const contained = containedPhotoDimensions(
      photo.width,
      photo.height,
      MAINTENANCE_PHOTO_MAX_DIMENSION,
    )

    let generatedCompatibleImage = false
    formatLoop: for (const { mimeType, qualities } of OUTPUT_FORMATS) {
      let encoderAvailable = false
      for (const scale of DIMENSION_SCALES) {
        const width = Math.max(1, Math.round(contained.width * scale))
        const height = Math.max(1, Math.round(contained.height * scale))

        for (const quality of qualities) {
          let blob: Blob | null
          try {
            blob = await dependencies.encode(photo, width, height, mimeType, quality)
          } catch {
            if (!encoderAvailable) continue formatLoop
            continue
          }
          if (!blob || blob.size <= 0 || blob.type !== mimeType) {
            if (!encoderAvailable) continue formatLoop
            continue
          }
          encoderAvailable = true
          generatedCompatibleImage = true
          if (blob.size <= MAINTENANCE_PHOTO_FINAL_MAX_BYTES) {
            return new File([blob], processedFileName(file.name, mimeType), {
              type: mimeType,
              lastModified: Date.now(),
            })
          }
        }
      }
    }

    if (!generatedCompatibleImage) {
      throw new Error('Este navegador não conseguiu gerar uma imagem reduzida compatível. Tente escolher a foto reduzida no iPhone ou use outra imagem.')
    }
  } finally {
    photo.close()
  }

  throw new Error('Não foi possível reduzir a imagem para até 10 MB. Escolha a opção de foto reduzida no iPhone ou use outra imagem.')
}
