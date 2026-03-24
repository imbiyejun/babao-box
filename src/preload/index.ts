import { contextBridge, ipcRenderer } from 'electron'

export interface NcmDecryptResult {
  audioData: ArrayBuffer
  format: string
  meta: Record<string, unknown>
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
}

const electronAPI: ElectronAPI = {
  openFileDialog: (filters) => ipcRenderer.invoke('dialog:openFile', filters),
  saveFileDialog: (defaultPath, filters) =>
    ipcRenderer.invoke('dialog:saveFile', defaultPath, filters),
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('file:write', filePath, data),
  decryptNcm: (filePath) => ipcRenderer.invoke('ncm:decrypt', filePath)
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
