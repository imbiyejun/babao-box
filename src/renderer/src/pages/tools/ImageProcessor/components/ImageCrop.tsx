import { useState, useCallback, useMemo, useEffect } from 'react'
import { Button, Select, InputNumber, Space, Typography, Radio, Card, message, Divider } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import type { CropRegion, CropShape, ImageFormatId, LoadedImage } from '@/types/image-process'
import { CROP_PRESETS, IMAGE_FORMAT_OPTIONS, imageSaveFilters, defaultSaveName } from '../constants'
import { cropImage } from '../utils/imageProcess'
import CropCanvas from './CropCanvas'

const { Text } = Typography

interface ImageCropProps {
  imageData: LoadedImage
}

export default function ImageCrop({ imageData }: ImageCropProps): React.ReactElement {
  const { element: image, fileName } = imageData

  const [shape, setShape] = useState<CropShape>('rectangle')
  const [presetId, setPresetId] = useState<string | null>(null)
  const [format, setFormat] = useState<ImageFormatId>('png')
  const [saving, setSaving] = useState(false)

  const defaultRegion = useMemo<CropRegion>(() => {
    const w = image.naturalWidth
    const h = image.naturalHeight
    const margin = 0.1
    return {
      x: Math.round(w * margin),
      y: Math.round(h * margin),
      width: Math.round(w * (1 - 2 * margin)),
      height: Math.round(h * (1 - 2 * margin))
    }
  }, [image])

  const [cropRegion, setCropRegion] = useState<CropRegion>(defaultRegion)

  // Reset crop when image changes
  useEffect(() => {
    setCropRegion(defaultRegion)
    setPresetId(null)
  }, [defaultRegion])

  const activePreset = useMemo(
    () => CROP_PRESETS.find((p) => p.id === presetId) ?? null,
    [presetId]
  )

  const aspectRatio = useMemo(() => {
    if (shape === 'circle') return 1
    if (activePreset) return activePreset.width / activePreset.height
    return null
  }, [shape, activePreset])

  const handlePresetChange = useCallback(
    (id: string | null) => {
      setPresetId(id)
      if (!id) return
      const preset = CROP_PRESETS.find((p) => p.id === id)
      if (!preset) return

      const ar = preset.width / preset.height
      const imgW = image.naturalWidth
      const imgH = image.naturalHeight

      let w: number, h: number
      if (imgW / imgH > ar) {
        h = Math.round(imgH * 0.8)
        w = Math.round(h * ar)
      } else {
        w = Math.round(imgW * 0.8)
        h = Math.round(w / ar)
      }

      setCropRegion({
        x: Math.round((imgW - w) / 2),
        y: Math.round((imgH - h) / 2),
        width: w,
        height: h
      })
    },
    [image]
  )

  const handleShapeChange = useCallback(
    (s: CropShape) => {
      setShape(s)
      if (s === 'circle') {
        setPresetId(null)
        const size = Math.min(cropRegion.width, cropRegion.height)
        setCropRegion((prev) => ({
          x: prev.x + Math.round((prev.width - size) / 2),
          y: prev.y + Math.round((prev.height - size) / 2),
          width: size,
          height: size
        }))
      }
    },
    [cropRegion]
  )

  const handleSave = useCallback(async () => {
    const stem = fileName.replace(/\.[^.]+$/, '')
    const outputFormat = shape === 'circle' ? 'png' as ImageFormatId : format
    const name = defaultSaveName(stem, 'crop', outputFormat)
    const result = await window.electronAPI.saveFileDialog(name, imageSaveFilters(outputFormat))
    if (result.canceled || !result.filePath) return

    setSaving(true)
    try {
      const outputSize = activePreset ? { width: activePreset.width, height: activePreset.height } : undefined
      const data = await cropImage(image, cropRegion, shape, outputFormat, 0.92, outputSize)
      await window.electronAPI.writeFile(result.filePath, data)
      message.success('保存成功')
    } catch (err) {
      message.error('保存失败: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }, [image, cropRegion, shape, format, fileName, activePreset])

  const presetOptions = useMemo(
    () => [
      { label: '自定义', value: '__custom__' },
      ...CROP_PRESETS.map((p) => ({ label: p.label, value: p.id }))
    ],
    []
  )

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      <Card size="small" style={{ width: 260, flexShrink: 0, overflowY: 'auto' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong>裁剪形状</Text>
            <Radio.Group
              value={shape}
              onChange={(e) => handleShapeChange(e.target.value)}
              style={{ display: 'flex', marginTop: 8 }}
              optionType="button"
              buttonStyle="solid"
              options={[
                { label: '矩形', value: 'rectangle' },
                { label: '圆形', value: 'circle' }
              ]}
            />
          </div>

          {shape === 'rectangle' && (
            <div>
              <Text strong>预设尺寸</Text>
              <Select
                value={presetId ?? '__custom__'}
                onChange={(v) => handlePresetChange(v === '__custom__' ? null : v)}
                options={presetOptions}
                style={{ width: '100%', marginTop: 8 }}
              />
            </div>
          )}

          <Divider style={{ margin: '4px 0' }} />

          <div>
            <Text strong>裁剪区域 (px)</Text>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>X</Text>
                <InputNumber
                  value={cropRegion.x}
                  min={0}
                  max={image.naturalWidth - cropRegion.width}
                  onChange={(v) => v !== null && setCropRegion((p) => ({ ...p, x: v }))}
                  style={{ width: '100%' }}
                  size="small"
                />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Y</Text>
                <InputNumber
                  value={cropRegion.y}
                  min={0}
                  max={image.naturalHeight - cropRegion.height}
                  onChange={(v) => v !== null && setCropRegion((p) => ({ ...p, y: v }))}
                  style={{ width: '100%' }}
                  size="small"
                />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>宽度</Text>
                <InputNumber
                  value={cropRegion.width}
                  min={MIN_SIZE}
                  max={image.naturalWidth - cropRegion.x}
                  onChange={(v) => v !== null && setCropRegion((p) => ({ ...p, width: v }))}
                  style={{ width: '100%' }}
                  size="small"
                />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>高度</Text>
                <InputNumber
                  value={cropRegion.height}
                  min={MIN_SIZE}
                  max={image.naturalHeight - cropRegion.y}
                  onChange={(v) => v !== null && setCropRegion((p) => ({ ...p, height: v }))}
                  style={{ width: '100%' }}
                  size="small"
                />
              </div>
            </div>
          </div>

          {activePreset && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              输出尺寸: {activePreset.width} × {activePreset.height} px
            </Text>
          )}

          <Divider style={{ margin: '4px 0' }} />

          {shape !== 'circle' && (
            <div>
              <Text strong>输出格式</Text>
              <Select
                value={format}
                onChange={setFormat}
                options={IMAGE_FORMAT_OPTIONS}
                style={{ width: '100%', marginTop: 8 }}
              />
            </div>
          )}

          {shape === 'circle' && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              圆形裁剪将以 PNG 格式保存（保留透明背景）
            </Text>
          )}

          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            block
          >
            保存裁剪
          </Button>
        </Space>
      </Card>

      <CropCanvas
        image={image}
        cropRegion={cropRegion}
        onCropChange={setCropRegion}
        shape={shape}
        aspectRatio={aspectRatio}
      />
    </div>
  )
}

const MIN_SIZE = 10
