export const PDF_OPEN_FILTERS: Electron.FileFilter[] = [
  { name: 'PDF 文件', extensions: ['pdf'] },
  { name: '所有文件', extensions: ['*'] }
]

export const PDF_SAVE_FILTERS: Electron.FileFilter[] = [
  { name: 'PDF 文件', extensions: ['pdf'] },
  { name: '所有文件', extensions: ['*'] }
]

export const WORD_SAVE_FILTERS: Electron.FileFilter[] = [
  { name: 'Word 文档', extensions: ['docx'] },
  { name: '所有文件', extensions: ['*'] }
]

export const IMAGE_SAVE_FILTERS: Electron.FileFilter[] = [
  { name: 'PNG 图片', extensions: ['png'] },
  { name: 'JPEG 图片', extensions: ['jpg', 'jpeg'] },
  { name: '所有文件', extensions: ['*'] }
]

export function pdfSaveName(stem: string, suffix: string): string {
  return `${stem}_${suffix}.pdf`
}

export function getStemName(fileName: string): string {
  return fileName.replace(/\.pdf$/i, '')
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
