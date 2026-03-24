import { useState, useCallback, useEffect, useRef } from 'react'
import { Button, Slider, Select, Card, Space, Typography, InputNumber, message, Divider } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import type { ImageFormatId, LoadedImage } from '@/types/image-process'
import { IMAGE_FORMAT_OPTIONS, imageSaveFilters, defaultSaveName } from '../constants'
import { exportImage, estimateSize, formatFileSize } from '../utils/imageProcess'

const { Text } = Typography

interface ImageCompressProps {
  imageData: LoadedImage
}

export default function ImageCompress({ imageData }: ImageCompressProps): React.ReactElement {
  const { element: image, fileName, originalSize } = imageData

  const [format, setFormat] = useState<ImageFormatId>('jpeg')
  const [quality, setQuality] = useState(80)
  const [maxWidth, setMaxWidth] = useState<number | undefined>(undefined)
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined)
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Debounced size estimation
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const size = await estimateSize(image, format, quality / 100, maxWidth, maxHeight)
        setEstimatedSize(size)
      } catch {
        setEstimatedSize(null)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [image, format, quality, maxWidth, maxHeight])

  const handleSave = useCallback(async () => {
    const stem = fileName.replace(/\.[^.]+$/, '')
    const name = defaultSaveName(stem, 'compressed', format)
    const result = await window.electronAPI.saveFileDialog(name, imageSaveFilters(format))
    if (result.canceled || !result.filePath) return

    setSaving(true)
    try {
      const data = await exportImage(image, format, quality / 100, maxWidth, maxHeight)
      await window.electronAPI.writeFile(result.filePath, data)
      message.success('保存成功')
    } catch (err) {
      message.error('保存失败: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }, [image, format, quality, maxWidth, maxHeight, fileName])

  const compressionRatio =
    estimatedSize !== null ? ((1 - estimatedSize / originalSize) * 100).toFixed(1) : null

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      <Card size="small" style={{ width: 280, flexShrink: 0, overflowY: 'auto' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong>原始信息</Text>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                尺寸: {image.naturalWidth} × {image.naturalHeight} px
              </Text>
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                大小: {formatFileSize(originalSize)}
              </Text>
            </div>
          </div>

          <Divider style={{ margin: '4px 0' }} />

          <div>
            <Text strong>输出格式</Text>
            <Select
              value={format}
              onChange={setFormat}
              options={IMAGE_FORMAT_OPTIONS}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>

          {format !== 'png' && (
            <div>
              <Text strong>质量 ({quality}%)</Text>
              <Slider min={1} max={100} value={quality} onChange={setQuality} />
            </div>
          )}

          <div>
            <Text strong>最大宽度 (px)</Text>
            <InputNumber
              value={maxWidth}
              min={1}
              max={image.naturalWidth}
              onChange={(v) => setMaxWidth(v ?? undefined)}
              style={{ width: '100%', marginTop: 8 }}
              placeholder={`原始: ${image.naturalWidth}`}
            />
          </div>

          <div>
            <Text strong>最大高度 (px)</Text>
            <InputNumber
              value={maxHeight}
              min={1}
              max={image.naturalHeight}
              onChange={(v) => setMaxHeight(v ?? undefined)}
              style={{ width: '100%', marginTop: 8 }}
              placeholder={`原始: ${image.naturalHeight}`}
            />
          </div>

          <Divider style={{ margin: '4px 0' }} />

          {estimatedSize !== null && (
            <div>
              <Text strong>预估结果</Text>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                  压缩后: {formatFileSize(estimatedSize)}
                </Text>
                <Text
                  type={Number(compressionRatio) > 0 ? 'success' : 'warning'}
                  style={{ fontSize: 12, display: 'block' }}
                >
                  {Number(compressionRatio) > 0
                    ? `减少 ${compressionRatio}%`
                    : `增加 ${Math.abs(Number(compressionRatio))}%`}
                </Text>
              </div>
            </div>
          )}

          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            block
          >
            保存压缩图片
          </Button>
        </Space>
      </Card>

      <PreviewPanel image={image} />
    </div>
  )
}

function PreviewPanel({ image }: { image: HTMLImageElement }): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const observer = new ResizeObserver((entries) => {
      const { width: cw, height: ch } = entries[0].contentRect
      if (cw === 0 || ch === 0) return
      canvas.width = cw
      canvas.height = ch
      const scale = Math.min(cw / image.naturalWidth, ch / image.naturalHeight)
      const dw = image.naturalWidth * scale
      const dh = image.naturalHeight * scale
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, cw, ch)
      ctx.drawImage(image, (cw - dw) / 2, (ch - dh) / 2, dw, dh)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [image])

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, minHeight: 0, background: '#1a1a1a', borderRadius: 8 }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  )
}
