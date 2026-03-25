export interface PdfInfo {
  pageCount: number
  fileSize: number
  encrypted: boolean
}

export interface PdfFileData {
  filePath: string
  fileName: string
  pageCount: number
  fileSize: number
  encrypted: boolean
}

export interface PdfSplitRange {
  start: number
  end: number
}

export interface PdfWatermarkOptions {
  text: string
  fontSize: number
  opacity: number
  rotation: number
  color: { r: number; g: number; b: number }
  position: 'center' | 'tile'
}

export interface PdfCompressResult {
  originalSize: number
  compressedSize: number
  data: ArrayBuffer
}
