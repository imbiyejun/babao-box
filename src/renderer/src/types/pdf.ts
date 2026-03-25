export interface PdfInfo {
  pageCount: number
  fileSize: number
}

export interface PdfFileData {
  filePath: string
  fileName: string
  pageCount: number
  fileSize: number
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

// Structured text extraction types

export interface PdfTextRun {
  text: string
  fontSize: number
  isBold: boolean
  isItalic: boolean
  fontName: string
}

export interface PdfTextLine {
  y: number
  runs: PdfTextRun[]
}

export interface PdfExtractedImage {
  data: ArrayBuffer
  width: number
  height: number
  pageX: number
  pageY: number
  displayWidth: number
  displayHeight: number
}

export interface PdfPageContent {
  pageIndex: number
  pageWidth: number
  pageHeight: number
  textLines: PdfTextLine[]
  images: PdfExtractedImage[]
}

export type PdfToWordMode = 'text' | 'image'

export interface PdfConvertProgress {
  phase: 'extracting' | 'building' | 'saving'
  current: number
  total: number
  message: string
}
