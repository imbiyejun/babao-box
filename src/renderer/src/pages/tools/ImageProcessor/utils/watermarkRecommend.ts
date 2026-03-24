import type { RecommendedColor, WatermarkRecommendation } from '@/types/image-process'

interface ImageColorAnalysis {
  avgR: number
  avgG: number
  avgB: number
  brightness: number
}

const SAMPLE_MAX_DIM = 100

function analyzeImageColors(image: HTMLImageElement): ImageColorAnalysis {
  const canvas = document.createElement('canvas')
  const scale = Math.min(1, SAMPLE_MAX_DIM / Math.max(image.naturalWidth, image.naturalHeight))
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  let totalR = 0,
    totalG = 0,
    totalB = 0
  const count = data.length / 4

  for (let i = 0; i < data.length; i += 4) {
    totalR += data[i]
    totalG += data[i + 1]
    totalB += data[i + 2]
  }

  const avgR = totalR / count
  const avgG = totalG / count
  const avgB = totalB / count

  return {
    avgR,
    avgG,
    avgB,
    // ITU-R BT.601 perceived brightness
    brightness: (avgR * 0.299 + avgG * 0.587 + avgB * 0.114) / 255
  }
}

function toHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v)))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  )
}

// Pick contrasting preset colors based on image brightness
function pickPresetColors(brightness: number): RecommendedColor[] {
  if (brightness > 0.6) {
    return [
      { color: '#000000', label: '黑色' },
      { color: '#333333', label: '深灰' },
      { color: '#1a237e', label: '深蓝' },
      { color: '#b71c1c', label: '深红' }
    ]
  }
  if (brightness < 0.4) {
    return [
      { color: '#ffffff', label: '白色' },
      { color: '#e0e0e0', label: '浅灰' },
      { color: '#ffd700', label: '金色' },
      { color: '#81d4fa', label: '浅蓝' }
    ]
  }
  return [
    { color: '#ffffff', label: '白色' },
    { color: '#000000', label: '黑色' },
    { color: '#ffd700', label: '金色' },
    { color: '#333333', label: '深灰' }
  ]
}

/**
 * Analyze image and return recommended watermark colors + font size.
 * Colors are chosen for maximum contrast against the average image brightness.
 */
export function getWatermarkRecommendation(image: HTMLImageElement): WatermarkRecommendation {
  const { avgR, avgG, avgB, brightness } = analyzeImageColors(image)

  const colors = pickPresetColors(brightness)

  // Complementary color from image average
  colors.push({
    color: toHex(255 - avgR, 255 - avgG, 255 - avgB),
    label: '互补色'
  })

  // ~4% of shorter dimension, clamped to slider range
  const minDim = Math.min(image.naturalWidth, image.naturalHeight)
  const fontSize = Math.max(12, Math.min(200, Math.round(minDim * 0.04)))

  return { colors, fontSize }
}
