import { useState, useCallback, useMemo } from 'react'
import { Button, Select, Card, Space, Typography, List, message, Divider, Switch } from 'antd'
import { SaveOutlined, DeleteOutlined, ClearOutlined, EyeOutlined } from '@ant-design/icons'
import type { SelectionRect, InpaintMethod, ImageFormatId, LoadedImage } from '@/types/image-process'
import {
  INPAINT_METHOD_OPTIONS,
  IMAGE_FORMAT_OPTIONS,
  imageSaveFilters,
  defaultSaveName
} from '../constants'
import { inpaintRegions, inpaintToArrayBuffer } from '../utils/inpaint'
import SelectionCanvas from './SelectionCanvas'

const { Text } = Typography

interface ImageRemoveWatermarkProps {
  imageData: LoadedImage
}

export default function ImageRemoveWatermark({ imageData }: ImageRemoveWatermarkProps): React.ReactElement {
  const { element: image, fileName } = imageData

  const [selections, setSelections] = useState<SelectionRect[]>([])
  const [method, setMethod] = useState<InpaintMethod>('combined')
  const [format, setFormat] = useState<ImageFormatId>('png')
  const [quality, setQuality] = useState(92)
  const [previewing, setPreviewing] = useState(false)
  const [previewData, setPreviewData] = useState<ImageData | null>(null)
  const [saving, setSaving] = useState(false)

  const handleAddSelection = useCallback((rect: SelectionRect) => {
    setSelections((prev) => [...prev, rect])
    setPreviewData(null)
    setPreviewing(false)
  }, [])

  const handleRemoveSelection = useCallback((index: number) => {
    setSelections((prev) => prev.filter((_, i) => i !== index))
    setPreviewData(null)
    setPreviewing(false)
  }, [])

  const handleClearAll = useCallback(() => {
    setSelections([])
    setPreviewData(null)
    setPreviewing(false)
  }, [])

  const handlePreviewToggle = useCallback(
    (checked: boolean) => {
      if (checked && selections.length > 0) {
        const canvas = document.createElement('canvas')
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(image, 0, 0)
        const srcData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const result = inpaintRegions(srcData, selections, method)
        setPreviewData(result)
        setPreviewing(true)
      } else {
        setPreviewData(null)
        setPreviewing(false)
      }
    },
    [image, selections, method]
  )

  const handleSave = useCallback(async () => {
    if (selections.length === 0) {
      message.warning('请先框选水印区域')
      return
    }

    const stem = fileName.replace(/\.[^.]+$/, '')
    const name = defaultSaveName(stem, 'clean', format)
    const result = await window.electronAPI.saveFileDialog(name, imageSaveFilters(format))
    if (result.canceled || !result.filePath) return

    setSaving(true)
    try {
      const data = await inpaintToArrayBuffer(image, selections, method, format, quality / 100)
      await window.electronAPI.writeFile(result.filePath, data)
      message.success('保存成功')
    } catch (err) {
      message.error('保存失败: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }, [image, selections, method, format, quality, fileName])

  const selectionListItems = useMemo(
    () =>
      selections.map((s, i) => ({
        key: i,
        label: `区域 ${i + 1}: ${s.width}×${s.height}`,
        index: i
      })),
    [selections]
  )

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      <Card size="small" style={{ width: 280, flexShrink: 0, overflowY: 'auto' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              在图片上框选水印区域，支持多区域选择。
              对纯色/渐变背景效果最佳。
            </Text>
          </div>

          <div>
            <Text strong>修复方法</Text>
            <Select
              value={method}
              onChange={(v) => {
                setMethod(v)
                setPreviewData(null)
                setPreviewing(false)
              }}
              options={INPAINT_METHOD_OPTIONS}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>

          <Divider style={{ margin: '4px 0' }} />

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong>选区列表 ({selections.length})</Text>
              {selections.length > 0 && (
                <Button
                  type="text"
                  size="small"
                  icon={<ClearOutlined />}
                  onClick={handleClearAll}
                  danger
                >
                  清空
                </Button>
              )}
            </div>
            {selections.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                在画布上拖拽鼠标框选水印区域
              </Text>
            ) : (
              <List
                size="small"
                style={{ marginTop: 8 }}
                dataSource={selectionListItems}
                renderItem={(item) => (
                  <List.Item
                    style={{ padding: '4px 0' }}
                    actions={[
                      <Button
                        key="del"
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveSelection(item.index)}
                        danger
                      />
                    ]}
                  >
                    <Text style={{ fontSize: 12 }}>{item.label}</Text>
                  </List.Item>
                )}
              />
            )}
          </div>

          <Divider style={{ margin: '4px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <EyeOutlined />
              <Text strong>预览效果</Text>
            </Space>
            <Switch
              checked={previewing}
              onChange={handlePreviewToggle}
              disabled={selections.length === 0}
              size="small"
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

          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            disabled={selections.length === 0}
            block
          >
            保存处理结果
          </Button>
        </Space>
      </Card>

      <SelectionCanvas
        image={image}
        selections={previewing ? [] : selections}
        onAddSelection={handleAddSelection}
        previewImageData={previewData}
      />
    </div>
  )
}
