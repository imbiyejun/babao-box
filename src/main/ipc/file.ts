import { ipcMain } from 'electron'
import { readFile, writeFile } from 'fs/promises'

export function registerFileHandlers(): void {
  ipcMain.handle('file:read', async (_event, filePath: string) => {
    const buffer = await readFile(filePath)
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  })

  ipcMain.handle('file:write', async (_event, filePath: string, data: ArrayBuffer) => {
    await writeFile(filePath, Buffer.from(data))
  })
}
