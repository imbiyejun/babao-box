import type {
  CropRegion,
  CropShape,
  ImageFormatId,
  WatermarkOptions
} from '@/types/image-process'

function getMimeType(format: ImageFormatId): string {
  return `image/${format}`
}

function canvasToBlob(canvas: HTMLCanvasElement, format: ImageFormatId, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode image'))),
      getMimeType(format),
      format === 'png' ? undefined : quality
    )
  })
}

export async function canvasToArrayBuffer(
  canvas: HTMLCanvasElement,
  format: ImageFormatId,
  quality: number
): Promise<ArrayBuffer> {
  const blob = await canvasToBlob(canvas, format, quality)
  return blob.arrayBuffer()
}

// Crop image and return as ArrayBuffer
export async function cropImage(
  image: HTMLImageElement,
  region: CropRegion,
  shape: CropShape,
  format: ImageFormatId,
  quality: number,
  outputSize?: { width: number; height: number }
): Promise<ArrayBuffer> {
  const outW = outputSize?.width ?? region.width
  const outH = outputSize?.height ?? region.height
  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')!

  if (shape === 'circle') {
    ctx.beginPath()
    ctx.arc(outW / 2, outH / 2, Math.min(outW, outH) / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
  }

  ctx.drawImage(image, region.x, region.y, region.width, region.height, 0, 0, outW, outH)
  return canvasToArrayBuffer(canvas, shape === 'circle' ? 'png' : format, quality)
}

// Add watermark and return as ArrayBuffer
export async function applyWatermark(
  image: HTMLImageElement,
  options: WatermarkOptions,
  format: ImageFormatId,
  quality: number
): Promise<ArrayBuffer> {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, 0, 0)
  drawWatermarkOnCtx(ctx, canvas.width, canvas.height, options)
  return canvasToArrayBuffer(canvas, format, quality)
}

// Draw watermark text on a 2D context (shared by preview and export)
export function drawWatermarkOnCtx(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: WatermarkOptions
): void {
  const { text, fontSize, color, opacity, position, rotation } = options
  if (!text) return

  ctx.save()
  ctx.globalAlpha = opacity
  ctx.fillStyle = color
  ctx.font = `${fontSize}px sans-serif`
  ctx.textBaseline = 'middle'

  const rad = (rotation * Math.PI) / 180

  if (position === 'tile') {
    const stepX = fontSize * text.length * 1.5
    const stepY = fontSize * 3
    // Expand draw range to cover rotated area
    const diagonal = Math.sqrt(width * width + height * height)
    ctx.translate(width / 2, height / 2)
    ctx.rotate(rad)
    for (let y = -diagonal; y < diagonal; y += stepY) {
      for (let x = -diagonal; x < diagonal; x += stepX) {
        ctx.fillText(text, x, y)
      }
    }
  } else {
    const padding = fontSize
    let x: number
    let y: number

    switch (position) {
      case 'top-left':
        x = padding
        y = padding + fontSize / 2
        ctx.textAlign = 'left'
        break
      case 'top-right':
        x = width - padding
        y = padding + fontSize / 2
        ctx.textAlign = 'right'
        break
      case 'bottom-left':
        x = padding
        y = height - padding - fontSize / 2
        ctx.textAlign = 'left'
        break
      case 'bottom-right':
        x = width - padding
        y = height - padding - fontSize / 2
        ctx.textAlign = 'right'
        break
      case 'center':
      default:
        x = width / 2
        y = height / 2
        ctx.textAlign = 'center'
        break
    }

    ctx.translate(x, y)
    ctx.rotate(rad)
    ctx.fillText(text, 0, 0)
  }

  ctx.restore()
}

// Compress / convert: draw image on canvas and export
export async function exportImage(
  image: HTMLImageElement,
  format: ImageFormatId,
  quality: number,
  maxWidth?: number,
  maxHeight?: number
): Promise<ArrayBuffer> {
  let w = image.naturalWidth
  let h = image.naturalHeight

  if (maxWidth && w > maxWidth) {
    h = Math.round(h * (maxWidth / w))
    w = maxWidth
  }
  if (maxHeight && h > maxHeight) {
    w = Math.round(w * (maxHeight / h))
    h = maxHeight
  }

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, 0, 0, w, h)
  return canvasToArrayBuffer(canvas, format, quality)
}

// Estimate blob size for preview (without full encoding)
export async function estimateSize(
  image: HTMLImageElement,
  format: ImageFormatId,
  quality: number,
  maxWidth?: number,
  maxHeight?: number
): Promise<number> {
  const buf = await exportImage(image, format, quality, maxWidth, maxHeight)
  return buf.byteLength
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
