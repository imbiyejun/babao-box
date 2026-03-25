import { contextBridge, ipcRenderer } from 'electron'

export interface NcmDecryptResult {
  audioData: ArrayBuffer
  format: string
  meta: Record<string, unknown>
}

export interface PdfInfo {
  pageCount: number
  fileSize: number
}

export interface PdfCompressResult {
  originalSize: number
  compressedSize: number
  data: ArrayBuffer
}

export interface PdfWatermarkOptions {
  text: string
  fontSize: number
  opacity: number
  rotation: number
  color: { r: number; g: number; b: number }
  position: 'center' | 'tile'
}

export interface PdfSplitRange {
  start: number
  end: number
}

export interface ElectronAPI {
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

const electronAPI: ElectronAPI = {
  openFileDialog: (filters) => ipcRenderer.invoke('dialog:openFile', filters),
  saveFileDialog: (defaultPath, filters) =>
    ipcRenderer.invoke('dialog:saveFile', defaultPath, filters),
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('file:write', filePath, data),
  decryptNcm: (filePath) => ipcRenderer.invoke('ncm:decrypt', filePath),
  onShowAbout: (callback) => {
    const handler = (_event: Electron.IpcRendererEvent, version: string): void => {
      callback(version)
    }
    ipcRenderer.on('app:showAbout', handler)
    return () => {
      ipcRenderer.removeListener('app:showAbout', handler)
    }
  },
  pdfGetInfo: (filePath) => ipcRenderer.invoke('pdf:getInfo', filePath),
  pdfMerge: (filePaths) => ipcRenderer.invoke('pdf:merge', filePaths),
  pdfSplit: (filePath, ranges) => ipcRenderer.invoke('pdf:split', filePath, ranges),
  pdfCompress: (filePath) => ipcRenderer.invoke('pdf:compress', filePath),
  pdfWatermark: (filePath, options) => ipcRenderer.invoke('pdf:watermark', filePath, options),
  selectPdfFiles: () => ipcRenderer.invoke('pdf:selectFiles'),
  selectDirectory: () => ipcRenderer.invoke('pdf:selectDirectory')
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
