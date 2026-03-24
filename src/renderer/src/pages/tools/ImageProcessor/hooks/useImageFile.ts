import { useState, useCallback } from 'react'
import { message } from 'antd'
import type { LoadedImage } from '@/types/image-process'
import { IMAGE_OPEN_FILTERS } from '../constants'

function loadImageElement(buffer: ArrayBuffer): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer])
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to decode image'))
    }
    img.src = url
  })
}

export function useImageFile() {
  const [imageData, setImageData] = useState<LoadedImage | null>(null)
  const [loading, setLoading] = useState(false)

  const openImage = useCallback(async () => {
    const result = await window.electronAPI.openFileDialog(IMAGE_OPEN_FILTERS)
    if (result.canceled || result.filePaths.length === 0) return

    const fp = result.filePaths[0]
    const name = fp.split(/[/\\]/).pop() || ''
    setLoading(true)
    try {
      const buffer = await window.electronAPI.readFile(fp)
      const element = await loadImageElement(buffer)
      setImageData({ element, fileName: name, originalSize: buffer.byteLength })
    } catch (err) {
      message.error('图片加载失败: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }, [])

  const loadFromDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return
    const path = (file as File & { path: string }).path
    if (!path) return

    setLoading(true)
    try {
      const buffer = await window.electronAPI.readFile(path)
      const element = await loadImageElement(buffer)
      setImageData({ element, fileName: file.name, originalSize: buffer.byteLength })
    } catch (err) {
      message.error('图片加载失败: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }, [])

  return { imageData, loading, setLoading, openImage, loadFromDrop }
}
