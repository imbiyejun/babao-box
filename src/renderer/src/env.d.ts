/// <reference types="vite/client" />

interface NcmDecryptResult {
  audioData: ArrayBuffer
  format: string
  meta: Record<string, unknown>
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
}

interface Window {
  electronAPI: ElectronAPI
}
