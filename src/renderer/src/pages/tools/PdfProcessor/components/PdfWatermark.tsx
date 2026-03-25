import { useState, useCallback } from 'react'
import { Button, Input, InputNumber, Slider, Radio, message, Form, ColorPicker, Space, Divider } from 'antd'
import { HighlightOutlined, ReloadOutlined, FolderOpenOutlined } from '@ant-design/icons'
import type { Color } from 'antd/es/color-picker'
import type { PdfFileData } from '@/types/pdf'
import type { PdfWatermarkOptions } from '@/types/pdf'
import { PDF_SAVE_FILTERS, getStemName } from '../constants'
import PdfEmptyState from './PdfEmptyState'

interface Props {
  pdfData: PdfFileData | null
  onOpenPdf: () => void
  onReset: () => void
}

function PdfWatermark({ pdfData, onOpenPdf, onReset }: Props): React.ReactElement {
  const [text, setText] = useState('机密文件')
  const [fontSize, setFontSize] = useState(36)
  const [opacity, setOpacity] = useState(0.15)
  const [rotation, setRotation] = useState(-30)
  const [color, setColor] = useState<Color | string>('#888888')
  const [position, setPosition] = useState<'center' | 'tile'>('tile')
  const [processing, setProcessing] = useState(false)

  const reset = useCallback(() => {
    setText('机密文件')
    setFontSize(36)
    setOpacity(0.15)
    setRotation(-30)
    setColor('#888888')
    setPosition('tile')
    onReset()
  }, [onReset])

  const getColorRgb = useCallback((): { r: number; g: number; b: number } => {
    const hex = typeof color === 'string' ? color : color.toHexString()
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    return { r, g, b }
  }, [color])

  const apply = useCallback(async () => {
    if (!pdfData) return
    if (!text.trim()) {
      message.warning('请输入水印文字')
      return
    }

    const stem = getStemName(pdfData.fileName)
    const result = await window.electronAPI.saveFileDialog(
      `${stem}_watermark.pdf`,
      PDF_SAVE_FILTERS
    )
    if (result.canceled || !result.filePath) return

    setProcessing(true)
    try {
      const options: PdfWatermarkOptions = {
        text: text.trim(),
        fontSize,
        opacity,
        rotation,
        color: getColorRgb(),
        position
      }
      const output = await window.electronAPI.pdfWatermark(pdfData.filePath, options)
      await window.electronAPI.writeFile(result.filePath, output)
      message.success('水印添加完成')
    } catch (e) {
      message.error('添加水印失败: ' + String(e))
    } finally {
      setProcessing(false)
    }
  }, [pdfData, text, fontSize, opacity, rotation, getColorRgb, position])

  if (!pdfData) return <PdfEmptyState onOpen={onOpenPdf} description="选择PDF文件添加水印" />

  return (
    <div style={{ maxWidth: 520 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<FolderOpenOutlined />} onClick={onOpenPdf}>
          更换文件
        </Button>
        <Button icon={<ReloadOutlined />} onClick={reset}>
          重置
        </Button>
      </Space>

      <Form layout="vertical">
        <Form.Item label="水印文字">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="请输入水印文字"
          />
        </Form.Item>

        <Form.Item label="布局方式">
          <Radio.Group value={position} onChange={(e) => setPosition(e.target.value)}>
            <Radio.Button value="center">居中</Radio.Button>
            <Radio.Button value="tile">平铺</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item label={`字体大小: ${fontSize}px`}>
          <Slider min={12} max={120} value={fontSize} onChange={setFontSize} />
        </Form.Item>

        <Form.Item label={`透明度: ${(opacity * 100).toFixed(0)}%`}>
          <Slider min={0.01} max={1} step={0.01} value={opacity} onChange={setOpacity} />
        </Form.Item>

        <Form.Item label={`旋转角度: ${rotation}°`}>
          <Slider min={-90} max={90} value={rotation} onChange={setRotation} />
        </Form.Item>

        <Form.Item label="颜色">
          <Space>
            <ColorPicker value={color} onChange={setColor} />
            <InputNumber
              addonBefore="R"
              min={0}
              max={255}
              value={Math.round(getColorRgb().r * 255)}
              disabled
              size="small"
              style={{ width: 90 }}
            />
            <InputNumber
              addonBefore="G"
              min={0}
              max={255}
              value={Math.round(getColorRgb().g * 255)}
              disabled
              size="small"
              style={{ width: 90 }}
            />
            <InputNumber
              addonBefore="B"
              min={0}
              max={255}
              value={Math.round(getColorRgb().b * 255)}
              disabled
              size="small"
              style={{ width: 90 }}
            />
          </Space>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            icon={<HighlightOutlined />}
            onClick={apply}
            loading={processing}
          >
            添加水印并保存
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}

export default PdfWatermark
