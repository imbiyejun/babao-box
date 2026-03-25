import { useState, useCallback } from 'react'
import type { PdfFileData } from '@/types/pdf'
import { PDF_OPEN_FILTERS } from '../constants'

export function usePdfFile(): {
  pdfData: PdfFileData | null
  loading: boolean
  openPdf: () => Promise<void>
  resetPdf: () => void
} {
  const [pdfData, setPdfData] = useState<PdfFileData | null>(null)
  const [loading, setLoading] = useState(false)

  const openPdf = useCallback(async () => {
    const result = await window.electronAPI.openFileDialog(PDF_OPEN_FILTERS)
    if (result.canceled || result.filePaths.length === 0) return

    const filePath = result.filePaths[0]
    const fileName = filePath.split(/[/\\]/).pop() || ''
    setLoading(true)
    try {
      const info = await window.electronAPI.pdfGetInfo(filePath)
      setPdfData({
        filePath,
        fileName,
        pageCount: info.pageCount,
        fileSize: info.fileSize
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const resetPdf = useCallback(() => {
    setPdfData(null)
  }, [])

  return { pdfData, loading, openPdf, resetPdf }
}
