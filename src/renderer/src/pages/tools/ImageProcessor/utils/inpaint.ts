import type { SelectionRect, InpaintMethod } from '@/types/image-process'

/**
 * Inpaint selected regions on an ImageData object.
 * Returns a new ImageData with watermark regions filled.
 */
export function inpaintRegions(
  imageData: ImageData,
  regions: SelectionRect[],
  method: InpaintMethod
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  )

  for (const region of regions) {
    const clamped = clampRect(region, imageData.width, imageData.height)
    if (clamped.width <= 0 || clamped.height <= 0) continue

    if (method === 'interpolate') {
      edgeInterpolate(result, clamped)
    } else if (method === 'blur') {
      boxBlurRegion(result, clamped, 5)
    } else {
      edgeInterpolate(result, clamped)
      boxBlurRegion(result, clamped, 2)
    }
  }

  return result
}

function clampRect(r: SelectionRect, w: number, h: number): SelectionRect {
  const x1 = Math.max(0, Math.round(r.x))
  const y1 = Math.max(0, Math.round(r.y))
  const x2 = Math.min(w, Math.round(r.x + r.width))
  const y2 = Math.min(h, Math.round(r.y + r.height))
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
}

// Weighted boundary interpolation with edge feathering
function edgeInterpolate(imageData: ImageData, rect: SelectionRect): void {
  const { data, width, height } = imageData
  const original = new Uint8ClampedArray(data)

  const x1 = rect.x
  const y1 = rect.y
  const x2 = rect.x + rect.width - 1
  const y2 = rect.y + rect.height - 1

  // Sample boundary: 1px strip outside the region
  const bL = Math.max(0, x1 - 1)
  const bR = Math.min(width - 1, x2 + 1)
  const bT = Math.max(0, y1 - 1)
  const bB = Math.min(height - 1, y2 + 1)

  const rw = rect.width
  const rh = rect.height
  const feather = Math.max(1, Math.min(6, Math.floor(Math.min(rw, rh) / 4)))

  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      const dl = x - x1 + 1
      const dr = x2 - x + 1
      const dt = y - y1 + 1
      const db = y2 - y + 1

      // Boundary pixel indices (from original, unmodified data)
      const lIdx = (y * width + bL) * 4
      const rIdx = (y * width + bR) * 4
      const tIdx = (bT * width + x) * 4
      const bIdx = (bB * width + x) * 4

      // Inverse distance squared weighting
      const wl = 1 / (dl * dl)
      const wr = 1 / (dr * dr)
      const wt = 1 / (dt * dt)
      const wb = 1 / (db * db)
      const totalW = wl + wr + wt + wb

      const idx = (y * width + x) * 4
      for (let c = 0; c < 3; c++) {
        data[idx + c] = Math.round(
          (original[lIdx + c] * wl +
            original[rIdx + c] * wr +
            original[tIdx + c] * wt +
            original[bIdx + c] * wb) /
            totalW
        )
      }

      // Edge feathering: blend with original near boundary for smooth transition
      const distToEdge = Math.min(dl, dr, dt, db)
      if (distToEdge <= feather) {
        const alpha = distToEdge / feather
        for (let c = 0; c < 3; c++) {
          data[idx + c] = Math.round(original[idx + c] * (1 - alpha) + data[idx + c] * alpha)
        }
      }
    }
  }
}

// Multi-pass box blur on a rectangular region
function boxBlurRegion(imageData: ImageData, rect: SelectionRect, passes: number): void {
  const { data, width } = imageData
  const x1 = rect.x
  const y1 = rect.y
  const x2 = rect.x + rect.width - 1
  const y2 = rect.y + rect.height - 1
  const radius = 3

  for (let p = 0; p < passes; p++) {
    const snapshot = new Uint8ClampedArray(data)

    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        let r = 0, g = 0, b = 0, count = 0

        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const sx = x + kx
            const sy = y + ky
            if (sx >= 0 && sx < width && sy >= 0 && sy < imageData.height) {
              const si = (sy * width + sx) * 4
              r += snapshot[si]
              g += snapshot[si + 1]
              b += snapshot[si + 2]
              count++
            }
          }
        }

        const idx = (y * width + x) * 4
        data[idx] = Math.round(r / count)
        data[idx + 1] = Math.round(g / count)
        data[idx + 2] = Math.round(b / count)
      }
    }
  }
}

// Render inpainted result onto a full-size canvas and return as ArrayBuffer
export async function inpaintToArrayBuffer(
  image: HTMLImageElement,
  regions: SelectionRect[],
  method: InpaintMethod,
  format: 'png' | 'jpeg' | 'webp',
  quality: number
): Promise<ArrayBuffer> {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, 0, 0)

  const srcData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const result = inpaintRegions(srcData, regions, method)
  ctx.putImageData(result, 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob.arrayBuffer()) : reject(new Error('Encode failed'))),
      `image/${format}`,
      format === 'png' ? undefined : quality
    )
  })
}
