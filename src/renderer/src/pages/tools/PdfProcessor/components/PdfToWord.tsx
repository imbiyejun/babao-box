import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Button,
  message,
  Space,
  Divider,
  Progress,
  Radio,
  InputNumber,
  Row,
  Col,
  Card,
  Typography,
  Alert
} from 'antd'
import {
  FileWordOutlined,
  ReloadOutlined,
  FolderOpenOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import type { PdfFileData, PdfToWordMode, PdfPageContent, PdfConvertProgress } from '@/types/pdf'
import { loadPdfDocument } from '../utils/pdfRenderer'
import { extractPageContent } from '../utils/pdfContentExtractor'
import { buildWordDocument } from '../utils/wordDocBuilder'
import { WORD_SAVE_FILTERS, getStemName } from '../constants'
import PdfEmptyState from './PdfEmptyState'

const { Text } = Typography

const MODE_DESCRIPTIONS: Record<PdfToWordMode, string> = {
  text: '提取PDF中的文字和图片，保留字体大小、粗体、斜体等格式。文字可在Word中编辑。',
  image: '将每页PDF渲染为高清图片嵌入Word，完美保留原始排版和视觉效果。文字不可编辑。'
}

const SCALE_OPTIONS = [
  { label: '标准 (1×)', value: 1 },
  { label: '清晰 (1.5×)', value: 1.5 },
  { label: '高清 (2×)', value: 2 },
  { label: '超清 (3×)', value: 3 }
]

interface Props {
  pdfData: PdfFileData | null
  onOpenPdf: () => void
  onReset: () => void
}

function PdfToWord({ pdfData, onOpenPdf, onReset }: Props): React.ReactElement {
  const [processing, setProcessing] = useState(false)
  const [mode, setMode] = useState<PdfToWordMode>('text')
  const [imageScale, setImageScale] = useState(2)
  const [pageStart, setPageStart] = useState(1)
  const [pageEnd, setPageEnd] = useState(1)
  const [progress, setProgress] = useState<PdfConvertProgress | null>(null)
  const cancelRef = useRef(false)

  useEffect(() => {
    if (pdfData) {
      setPageStart(1)
      setPageEnd(pdfData.pageCount)
      setProgress(null)
    }
  }, [pdfData])

  const reset = useCallback(() => {
    cancelRef.current = true
    setProgress(null)
    onReset()
  }, [onReset])

  const convert = useCallback(async () => {
    if (!pdfData) return

    cancelRef.current = false
    setProcessing(true)
    setProgress({ phase: 'extracting', current: 0, total: 1, message: '正在读取PDF...' })

    try {
      const buffer = await window.electronAPI.readFile(pdfData.filePath)
      const pdf = await loadPdfDocument(buffer)

      const start = Math.max(1, pageStart)
      const end = Math.min(pageEnd, pdf.numPages)
      const totalPages = end - start + 1

      if (totalPages <= 0) {
        message.warning('页码范围无效')
        setProgress(null)
        setProcessing(false)
        return
      }

      const pages: PdfPageContent[] = []
      let extractedImageCount = 0

      for (let i = start; i <= end; i++) {
        if (cancelRef.current) {
          message.info('转换已取消')
          setProgress(null)
          setProcessing(false)
          return
        }

        setProgress({
          phase: 'extracting',
          current: i - start + 1,
          total: totalPages,
          message: `正在提取第 ${i} 页内容 (${i - start + 1}/${totalPages})...`
        })

        const page = await pdf.getPage(i)
        const content = await extractPageContent(page, i - 1, mode, imageScale)
        extractedImageCount += content.images.length
        pages.push(content)
      }

      setProgress({
        phase: 'building',
        current: totalPages,
        total: totalPages,
        message: '正在生成Word文档...'
      })

      const blob = await buildWordDocument(pages)

      const stem = getStemName(pdfData.fileName)
      const result = await window.electronAPI.saveFileDialog(`${stem}.docx`, WORD_SAVE_FILTERS)
      if (result.canceled || !result.filePath) {
        setProgress(null)
        setProcessing(false)
        return
      }

      setProgress({
        phase: 'saving',
        current: totalPages,
        total: totalPages,
        message: '正在保存文件...'
      })

      const arrayBuffer = await blob.arrayBuffer()
      await window.electronAPI.writeFile(result.filePath, arrayBuffer)

      const detail =
        mode === 'text'
          ? `共 ${totalPages} 页，提取 ${extractedImageCount} 张图片`
          : `共 ${totalPages} 页`
      message.success(`Word文档已保存。${detail}`)
      setProgress(null)
    } catch (e) {
      if (!cancelRef.current) {
        message.error('转换失败: ' + String(e))
      }
      setProgress(null)
    } finally {
      setProcessing(false)
    }
  }, [pdfData, mode, imageScale, pageStart, pageEnd])

  if (!pdfData) {
    return (
      <PdfEmptyState onOpen={onOpenPdf} description="选择PDF文件，保留格式转换为Word文档" />
    )
  }

  const progressPercent = progress
    ? Math.round((progress.current / Math.max(progress.total, 1)) * 100)
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card size="small" title="转换设置">
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Space>
              <Text strong>转换模式：</Text>
              <Radio.Group
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                disabled={processing}
                optionType="button"
                buttonStyle="solid"
                options={[
                  { label: '文本提取', value: 'text' },
                  { label: '高保真（图片）', value: 'image' }
                ]}
              />
            </Space>
          </Col>

          {mode === 'image' && (
            <Col span={24}>
              <Space>
                <Text strong>图片质量：</Text>
                <Radio.Group
                  value={imageScale}
                  onChange={(e) => setImageScale(e.target.value)}
                  disabled={processing}
                  optionType="button"
                  options={SCALE_OPTIONS}
                />
              </Space>
            </Col>
          )}

          <Col span={24}>
            <Space align="center">
              <Text strong>页码范围：</Text>
              <InputNumber
                min={1}
                max={pdfData.pageCount}
                value={pageStart}
                onChange={(v) => setPageStart(v ?? 1)}
                disabled={processing}
                size="small"
                style={{ width: 80 }}
              />
              <Text>至</Text>
              <InputNumber
                min={1}
                max={pdfData.pageCount}
                value={pageEnd}
                onChange={(v) => setPageEnd(v ?? pdfData.pageCount)}
                disabled={processing}
                size="small"
                style={{ width: 80 }}
              />
              <Text type="secondary">共 {pdfData.pageCount} 页</Text>
            </Space>
          </Col>
        </Row>
      </Card>

      <Alert message={MODE_DESCRIPTIONS[mode]} type="info" showIcon />

      <Space>
        <Button
          type="primary"
          icon={mode === 'image' ? <FileWordOutlined /> : <ThunderboltOutlined />}
          onClick={convert}
          loading={processing}
          size="large"
        >
          开始转换
        </Button>
        <Divider type="vertical" />
        <Button icon={<FolderOpenOutlined />} onClick={onOpenPdf} disabled={processing}>
          更换文件
        </Button>
        <Button icon={<ReloadOutlined />} onClick={reset} disabled={processing}>
          重置
        </Button>
      </Space>

      {progress && (
        <Card size="small">
          <Progress
            percent={progressPercent}
            status="active"
            strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
          />
          <Text type="secondary" style={{ marginTop: 4, display: 'block' }}>
            {progress.message}
          </Text>
        </Card>
      )}
    </div>
  )
}

export default PdfToWord
