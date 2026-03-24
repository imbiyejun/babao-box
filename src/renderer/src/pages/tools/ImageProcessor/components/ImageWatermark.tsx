import { useState, useRef, useEffect, useCallback } from 'react'
import { Button, Input, Slider, Select, Card, Space, Typography, ColorPicker, message, Divider } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import type { WatermarkOptions, ImageFormatId, LoadedImage } from '@/types/image-process'
import {
  IMAGE_FORMAT_OPTIONS,
  WATERMARK_POSITION_OPTIONS,
  imageSaveFilters,
  defaultSaveName
} from '../constants'
import { applyWatermark, drawWatermarkOnCtx } from '../utils/imageProcess'

const { Text } = Typography

interface ImageWatermarkProps {
  imageData: LoadedImage
}

const DEFAULT_OPTIONS: WatermarkOptions = {
  text: '水印文字',
  fontSize: 24,
  color: '#ffffff',
  opacity: 0.5,
  position: 'bottom-right',
  rotation: 0
}

export default function ImageWatermark({ imageData }: ImageWatermarkProps): React.ReactElement {
  const { element: image, fileName } = imageData

  const [options, setOptions] = useState<WatermarkOptions>(DEFAULT_OPTIONS)
  const [format, setFormat] = useState<ImageFormatId>('png')
  const [quality, setQuality] = useState(92)
  const [saving, setSaving] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const updateOption = useCallback(<K extends keyof WatermarkOptions>(key: K, value: WatermarkOptions[K]) => {
    setOptions((prev) => ({ ...prev, [key]: value }))
  }, [])

  // Redraw preview when options change
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const cw = container.clientWidth
    const ch = container.clientHeight
    if (cw === 0 || ch === 0) return

    canvas.width = cw
    canvas.height = ch

    const scale = Math.min(cw / image.naturalWidth, ch / image.naturalHeight)
    const dw = image.naturalWidth * scale
    const dh = image.naturalHeight * scale
    const ox = (cw - dw) / 2
    const oy = (ch - dh) / 2

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, cw, ch)
    ctx.drawImage(image, ox, oy, dw, dh)

    // Draw watermark at preview scale
    ctx.save()
    ctx.translate(ox, oy)
    ctx.beginPath()
    ctx.rect(0, 0, dw, dh)
    ctx.clip()
    drawWatermarkOnCtx(ctx, dw, dh, { ...options, fontSize: options.fontSize * scale })
    ctx.restore()
  }, [image, options])

  // Observe container resize
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => {
      setOptions((o) => ({ ...o })) // trigger redraw
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const handleSave = useCallback(async () => {
    const stem = fileName.replace(/\.[^.]+$/, '')
    const name = defaultSaveName(stem, 'watermark', format)
    const result = await window.electronAPI.saveFileDialog(name, imageSaveFilters(format))
    if (result.canceled || !result.filePath) return

    setSaving(true)
    try {
      const data = await applyWatermark(image, options, format, quality / 100)
      await window.electronAPI.writeFile(result.filePath, data)
      message.success('保存成功')
    } catch (err) {
      message.error('保存失败: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }, [image, options, format, quality, fileName])

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      <Card size="small" style={{ width: 280, flexShrink: 0, overflowY: 'auto' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong>水印文字</Text>
            <Input
              value={options.text}
              onChange={(e) => updateOption('text', e.target.value)}
              style={{ marginTop: 8 }}
              placeholder="输入水印内容"
            />
          </div>

          <div>
            <Text strong>字体大小</Text>
            <Slider
              min={8}
              max={200}
              value={options.fontSize}
              onChange={(v) => updateOption('fontSize', v)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Text strong>颜色</Text>
            <ColorPicker
              value={options.color}
              onChange={(_, hex) => updateOption('color', hex)}
            />
          </div>

          <div>
            <Text strong>透明度</Text>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={options.opacity}
              onChange={(v) => updateOption('opacity', v)}
            />
          </div>

          <div>
            <Text strong>位置</Text>
            <Select
              value={options.position}
              onChange={(v) => updateOption('position', v)}
              options={WATERMARK_POSITION_OPTIONS}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>

          <div>
            <Text strong>旋转角度</Text>
            <Slider
              min={-180}
              max={180}
              value={options.rotation}
              onChange={(v) => updateOption('rotation', v)}
            />
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

          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            block
          >
            保存水印图片
          </Button>
        </Space>
      </Card>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          background: '#1a1a1a',
          borderRadius: 8
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
      </div>
    </div>
  )
}
