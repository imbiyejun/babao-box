import { ipcMain } from 'electron'
import { readFile } from 'fs/promises'
import { decryptNcmFile } from '../utils/ncmDecrypt'

export function registerNcmHandlers(): void {
  ipcMain.handle('ncm:decrypt', async (_event, filePath: string) => {
    const raw = await readFile(filePath)
    const result = decryptNcmFile(raw)
    return {
      audioData: result.audioData.buffer.slice(
        result.audioData.byteOffset,
        result.audioData.byteOffset + result.audioData.byteLength
      ),
      format: result.format,
      meta: result.meta
    }
  })
}
