import type { CropPreset, ImageFormatId, WatermarkPosition } from '@/types/image-process'

// 300 DPI standard photo sizes
export const CROP_PRESETS: CropPreset[] = [
  { id: '1inch', label: '一寸照 (25×35mm)', width: 295, height: 413 },
  { id: '2inch', label: '二寸照 (35×49mm)', width: 413, height: 579 },
  { id: 'small-2inch', label: '小二寸 (33×48mm)', width: 390, height: 567 },
  { id: '16:9', label: '16:9', width: 1920, height: 1080 },
  { id: '4:3', label: '4:3', width: 1600, height: 1200 },
  { id: '1:1', label: '1:1', width: 1000, height: 1000 },
  { id: '3:4', label: '3:4', width: 1200, height: 1600 }
]

export const IMAGE_OPEN_FILTERS: Electron.FileFilter[] = [
  { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'] },
  { name: '所有文件', extensions: ['*'] }
]

export const IMAGE_FORMAT_OPTIONS: { label: string; value: ImageFormatId }[] = [
  { label: 'PNG', value: 'png' },
  { label: 'JPEG', value: 'jpeg' },
  { label: 'WebP', value: 'webp' }
]

export const WATERMARK_POSITION_OPTIONS: { label: string; value: WatermarkPosition }[] = [
  { label: '左上角', value: 'top-left' },
  { label: '右上角', value: 'top-right' },
  { label: '左下角', value: 'bottom-left' },
  { label: '右下角', value: 'bottom-right' },
  { label: '居中', value: 'center' },
  { label: '平铺', value: 'tile' }
]

export function imageSaveFilters(format: ImageFormatId): Electron.FileFilter[] {
  const map: Record<ImageFormatId, Electron.FileFilter> = {
    png: { name: 'PNG 图片', extensions: ['png'] },
    jpeg: { name: 'JPEG 图片', extensions: ['jpg', 'jpeg'] },
    webp: { name: 'WebP 图片', extensions: ['webp'] }
  }
  return [map[format], { name: '所有文件', extensions: ['*'] }]
}

export function defaultSaveName(stem: string, suffix: string, format: ImageFormatId): string {
  const ext = format === 'jpeg' ? 'jpg' : format
  return `${stem}_${suffix}.${ext}`
}
