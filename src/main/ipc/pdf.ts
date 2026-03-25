import { ipcMain, dialog } from 'electron'
import { readFile } from 'fs/promises'
import {
  getPdfInfo,
  mergePdfs,
  splitPdf,
  compressPdf,
  addWatermark
} from '../utils/pdfProcess'

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

function uint8ToArrayBuffer(arr: Uint8Array): ArrayBuffer {
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength)
}

export function registerPdfHandlers(): void {
  ipcMain.handle('pdf:getInfo', async (_event, filePath: string) => {
    const buf = await readFile(filePath)
    return getPdfInfo(toArrayBuffer(buf))
  })

  ipcMain.handle('pdf:merge', async (_event, filePaths: string[]) => {
    const buffers = await Promise.all(
      filePaths.map(async (fp) => {
        const buf = await readFile(fp)
        return toArrayBuffer(buf)
      })
    )
    const result = await mergePdfs(buffers)
    return uint8ToArrayBuffer(result)
  })

  ipcMain.handle(
    'pdf:split',
    async (_event, filePath: string, ranges: { start: number; end: number }[]) => {
      const buf = await readFile(filePath)
      const results = await splitPdf(toArrayBuffer(buf), ranges)
      return results.map((r) => uint8ToArrayBuffer(r))
    }
  )

  ipcMain.handle('pdf:compress', async (_event, filePath: string) => {
    const buf = await readFile(filePath)
    const original = buf.byteLength
    const result = await compressPdf(toArrayBuffer(buf))
    return {
      originalSize: original,
      compressedSize: result.byteLength,
      data: uint8ToArrayBuffer(result)
    }
  })

  ipcMain.handle(
    'pdf:watermark',
    async (
      _event,
      filePath: string,
      options: {
        text: string
        fontSize: number
        opacity: number
        rotation: number
        color: { r: number; g: number; b: number }
        position: 'center' | 'tile'
      }
    ) => {
      const buf = await readFile(filePath)
      const result = await addWatermark(toArrayBuffer(buf), options)
      return uint8ToArrayBuffer(result)
    }
  )

  // Multi-file selection dialog for merge
  ipcMain.handle('pdf:selectFiles', async () => {
    return dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'PDF 文件', extensions: ['pdf'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    })
  })

  // Directory selection dialog for split output
  ipcMain.handle('pdf:selectDirectory', async () => {
    return dialog.showOpenDialog({
      properties: ['openDirectory']
    })
  })
}
