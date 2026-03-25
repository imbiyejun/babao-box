/// <reference types="vite/client" />

interface NcmDecryptResult {
  audioData: ArrayBuffer
  format: string
  meta: Record<string, unknown>
}

interface PdfInfo {
  pageCount: number
  fileSize: number
}

interface PdfCompressResult {
  originalSize: number
  compressedSize: number
  data: ArrayBuffer
}

interface PdfWatermarkOptions {
  text: string
  fontSize: number
  opacity: number
  rotation: number
  color: { r: number; g: number; b: number }
  position: 'center' | 'tile'
}

interface PdfSplitRange {
  start: number
  end: number
}

interface ElectronAPI {
  openFileDialog: (filters?: Electron.FileFilter[]) => Promise<Electron.OpenDialogReturnValue>
  saveFileDialog: (
    defaultPath?: string,
    filters?: Electron.FileFilter[]
  ) => Promise<Electron.SaveDialogReturnValue>
  readFile: (filePath: string) => Promise<ArrayBuffer>
  writeFile: (filePath: string, data: ArrayBuffer) => Promise<void>
  decryptNcm: (filePath: string) => Promise<NcmDecryptResult>
  onShowAbout: (callback: (version: string) => void) => () => void
  pdfGetInfo: (filePath: string) => Promise<PdfInfo>
  pdfMerge: (filePaths: string[]) => Promise<ArrayBuffer>
  pdfSplit: (filePath: string, ranges: PdfSplitRange[]) => Promise<ArrayBuffer[]>
  pdfCompress: (filePath: string) => Promise<PdfCompressResult>
  pdfWatermark: (filePath: string, options: PdfWatermarkOptions) => Promise<ArrayBuffer>
  selectPdfFiles: () => Promise<Electron.OpenDialogReturnValue>
  selectDirectory: () => Promise<Electron.OpenDialogReturnValue>
}

interface Window {
  electronAPI: ElectronAPI
}
