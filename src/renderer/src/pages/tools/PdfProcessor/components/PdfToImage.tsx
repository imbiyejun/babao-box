import { useState, useCallback } from 'react'
import { Button, Space, Select, InputNumber, message, Progress, Card, Divider } from 'antd'
import { DownloadOutlined, ReloadOutlined, FolderOpenOutlined } from '@ant-design/icons'
import type { PdfFileData } from '@/types/pdf'
import { loadPdfDocument, renderPageToCanvas } from '../utils/pdfRenderer'
import { IMAGE_SAVE_FILTERS, getStemName } from '../constants'
import PdfEmptyState from './PdfEmptyState'

interface Props {
  pdfData: PdfFileData | null
  onOpenPdf: () => void
  onReset: () => void
}

function PdfToImage({ pdfData, onOpenPdf, onReset }: Props): React.ReactElement {
  const [format, setFormat] = useState<'png' | 'jpeg'>('png')
  const [scale, setScale] = useState(2)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [previews, setPreviews] = useState<string[]>([])

  const reset = useCallback(() => {
    setPreviews([])
    setProgress(0)
    onReset()
  }, [onReset])

  const generatePreviews = useCallback(async () => {
    if (!pdfData) return
    setProcessing(true)
    setProgress(0)
    setPreviews([])
    try {
      const buffer = await window.electronAPI.readFile(pdfData.filePath)
      const pdf = await loadPdfDocument(buffer)
      const urls: string[] = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const canvas = await renderPageToCanvas(pdf, i, scale)
        urls.push(canvas.toDataURL(`image/${format}`))
        setProgress(Math.round((i / pdf.numPages) * 100))
      }
      setPreviews(urls)
      message.success(`已生成 ${urls.length} 页预览`)
    } catch (e) {
      message.error('转换失败: ' + String(e))
    } finally {
      setProcessing(false)
    }
  }, [pdfData, scale, format])

  const saveAll = useCallback(async () => {
    if (!pdfData || previews.length === 0) return
    const dirResult = await window.electronAPI.selectDirectory()
    if (dirResult.canceled || !dirResult.filePaths.length) return

    const dir = dirResult.filePaths[0]
    const stem = getStemName(pdfData.fileName)
    const ext = format === 'jpeg' ? 'jpg' : 'png'

    setProcessing(true)
    try {
      for (let i = 0; i < previews.length; i++) {
        const dataUrl = previews[i]
        const base64 = dataUrl.split(',')[1]
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j)
        const filePath = `${dir}\\${stem}_page${i + 1}.${ext}`
        await window.electronAPI.writeFile(filePath, bytes.buffer)
      }
      message.success(`已保存 ${previews.length} 张图片到 ${dir}`)
    } catch (e) {
      message.error('保存失败: ' + String(e))
    } finally {
      setProcessing(false)
    }
  }, [pdfData, previews, format])

  const saveSingle = useCallback(
    async (index: number) => {
      if (!pdfData) return
      const stem = getStemName(pdfData.fileName)
      const ext = format === 'jpeg' ? 'jpg' : 'png'
      const result = await window.electronAPI.saveFileDialog(
        `${stem}_page${index + 1}.${ext}`,
        IMAGE_SAVE_FILTERS
      )
      if (result.canceled || !result.filePath) return

      const dataUrl = previews[index]
      const base64 = dataUrl.split(',')[1]
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j)
      await window.electronAPI.writeFile(result.filePath, bytes.buffer)
      message.success('图片已保存')
    },
    [pdfData, previews, format]
  )

  if (!pdfData) return <PdfEmptyState onOpen={onOpenPdf} description="选择PDF文件，转换为图片" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Space wrap>
        <span>输出格式：</span>
        <Select value={format} onChange={setFormat} style={{ width: 100 }}>
          <Select.Option value="png">PNG</Select.Option>
          <Select.Option value="jpeg">JPEG</Select.Option>
        </Select>
        <span>缩放倍数：</span>
        <InputNumber min={1} max={4} step={0.5} value={scale} onChange={(v) => setScale(v || 2)} />
        <Button type="primary" onClick={generatePreviews} loading={processing}>
          开始转换
        </Button>
        {previews.length > 0 && (
          <Button icon={<DownloadOutlined />} onClick={saveAll} loading={processing}>
            全部保存
          </Button>
        )}
        <Divider type="vertical" />
        <Button icon={<FolderOpenOutlined />} onClick={onOpenPdf}>
          更换文件
        </Button>
        <Button icon={<ReloadOutlined />} onClick={reset}>
          重置
        </Button>
      </Space>

      {processing && <Progress percent={progress} />}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, overflow: 'auto', maxHeight: 500 }}>
        {previews.map((url, i) => (
          <Card
            key={i}
            size="small"
            title={`第 ${i + 1} 页`}
            extra={
              <Button size="small" type="link" onClick={() => saveSingle(i)}>
                保存
              </Button>
            }
            style={{ width: 220 }}
          >
            <img src={url} alt={`page-${i + 1}`} style={{ width: '100%' }} />
          </Card>
        ))}
      </div>
    </div>
  )
}

export default PdfToImage
