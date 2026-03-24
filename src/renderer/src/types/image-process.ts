export type CropShape = 'rectangle' | 'circle'

export interface CropRegion {
  x: number
  y: number
  width: number
  height: number
}

export interface CropPreset {
  id: string
  label: string
  width: number
  height: number
}

export type WatermarkPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center'
  | 'tile'

export interface WatermarkOptions {
  text: string
  fontSize: number
  color: string
  opacity: number
  position: WatermarkPosition
  rotation: number
}

export type ImageFormatId = 'png' | 'jpeg' | 'webp'

export interface LoadedImage {
  element: HTMLImageElement
  fileName: string
  originalSize: number
}
