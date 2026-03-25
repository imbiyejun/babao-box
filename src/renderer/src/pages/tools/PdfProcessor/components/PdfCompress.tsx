import { useState, useCallback } from 'react'
import { Button, message, Typography, Card, Statistic, Row, Col, Space, Divider } from 'antd'
import { CompressOutlined, DownloadOutlined, ReloadOutlined, FolderOpenOutlined } from '@ant-design/icons'
import type { PdfFileData } from '@/types/pdf'
import { PDF_SAVE_FILTERS, getStemName, formatFileSize } from '../constants'
import PdfEmptyState from './PdfEmptyState'

const { Text } = Typography

interface Props {
  pdfData: PdfFileData | null
  onOpenPdf: () => void
  onReset: () => void
}

function PdfCompress({ pdfData, onOpenPdf, onReset }: Props): React.ReactElement {
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<{
    originalSize: number
    compressedSize: number
    data: ArrayBuffer
  } | null>(null)

  const reset = useCallback(() => {
    setResult(null)
    onReset()
  }, [onReset])

  const compress = useCallback(async () => {
    if (!pdfData) return
    setProcessing(true)
    setResult(null)
    try {
      const res = await window.electronAPI.pdfCompress(pdfData.filePath)
      setResult(res)
      const ratio = ((1 - res.compressedSize / res.originalSize) * 100).toFixed(1)
      message.success(`压缩完成，减少了 ${ratio}%`)
    } catch (e) {
      message.error('压缩失败: ' + String(e))
    } finally {
      setProcessing(false)
    }
  }, [pdfData])

  const save = useCallback(async () => {
    if (!pdfData || !result) return
    const stem = getStemName(pdfData.fileName)
    const saveResult = await window.electronAPI.saveFileDialog(
      `${stem}_compressed.pdf`,
      PDF_SAVE_FILTERS
    )
    if (saveResult.canceled || !saveResult.filePath) return

    try {
      await window.electronAPI.writeFile(saveResult.filePath, result.data)
      message.success('已保存压缩后的PDF')
    } catch (e) {
      message.error('保存失败: ' + String(e))
    }
  }, [pdfData, result])

  if (!pdfData) return <PdfEmptyState onOpen={onOpenPdf} description="选择PDF文件进行压缩" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Space wrap>
        <Text>
          当前文件大小：<Text strong>{formatFileSize(pdfData.fileSize)}</Text>
        </Text>
        <Divider type="vertical" />
        <Button icon={<FolderOpenOutlined />} onClick={onOpenPdf}>
          更换文件
        </Button>
        <Button icon={<ReloadOutlined />} onClick={reset}>
          重置
        </Button>
      </Space>

      <Space>
        <Button
          type="primary"
          icon={<CompressOutlined />}
          onClick={compress}
          loading={processing}
        >
          开始压缩
        </Button>
        {result && (
          <Button icon={<DownloadOutlined />} onClick={save}>
            保存结果
          </Button>
        )}
      </Space>

      {result && (
        <Card size="small">
          <Row gutter={24}>
            <Col span={8}>
              <Statistic title="原始大小" value={formatFileSize(result.originalSize)} />
            </Col>
            <Col span={8}>
              <Statistic title="压缩后大小" value={formatFileSize(result.compressedSize)} />
            </Col>
            <Col span={8}>
              <Statistic
                title="压缩率"
                value={((1 - result.compressedSize / result.originalSize) * 100).toFixed(1)}
                suffix="%"
              />
            </Col>
          </Row>
        </Card>
      )}
    </div>
  )
}

export default PdfCompress
