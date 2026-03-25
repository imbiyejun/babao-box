import { useState, useCallback } from 'react'
import { Button, message, Input, Space, Divider } from 'antd'
import { FileWordOutlined, ReloadOutlined, FolderOpenOutlined } from '@ant-design/icons'
import { Document, Packer, Paragraph, TextRun, PageBreak } from 'docx'
import type { PdfFileData } from '@/types/pdf'
import { loadPdfDocument, extractAllText } from '../utils/pdfRenderer'
import { WORD_SAVE_FILTERS, getStemName } from '../constants'
import PdfEmptyState from './PdfEmptyState'

interface Props {
  pdfData: PdfFileData | null
  onOpenPdf: () => void
  onReset: () => void
}

function PdfToWord({ pdfData, onOpenPdf, onReset }: Props): React.ReactElement {
  const [processing, setProcessing] = useState(false)
  const [extractedText, setExtractedText] = useState<string[]>([])

  const reset = useCallback(() => {
    setExtractedText([])
    onReset()
  }, [onReset])

  const extract = useCallback(async () => {
    if (!pdfData) return
    setProcessing(true)
    try {
      const buffer = await window.electronAPI.readFile(pdfData.filePath)
      const pdf = await loadPdfDocument(buffer)
      const pages = await extractAllText(pdf)
      setExtractedText(pages)
      message.success(`已提取 ${pages.length} 页文本`)
    } catch (e) {
      message.error('提取文本失败: ' + String(e))
    } finally {
      setProcessing(false)
    }
  }, [pdfData])

  const saveAsWord = useCallback(async () => {
    if (!pdfData || extractedText.length === 0) return

    const stem = getStemName(pdfData.fileName)
    const result = await window.electronAPI.saveFileDialog(`${stem}.docx`, WORD_SAVE_FILTERS)
    if (result.canceled || !result.filePath) return

    setProcessing(true)
    try {
      const children = extractedText.flatMap((pageText, pageIdx) => {
        const paragraphs = pageText
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => new Paragraph({ children: [new TextRun(line)] }))

        if (pageIdx < extractedText.length - 1) {
          paragraphs.push(
            new Paragraph({
              children: [new PageBreak()]
            })
          )
        }
        return paragraphs
      })

      const doc = new Document({ sections: [{ children }] })
      const blob = await Packer.toBlob(doc)
      const arrayBuffer = await blob.arrayBuffer()
      await window.electronAPI.writeFile(result.filePath, arrayBuffer)
      message.success('Word文档已保存')
    } catch (e) {
      message.error('保存失败: ' + String(e))
    } finally {
      setProcessing(false)
    }
  }, [pdfData, extractedText])

  if (!pdfData) return <PdfEmptyState onOpen={onOpenPdf} description="选择PDF文件，提取文本并转换为Word" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Space>
        <Button type="primary" onClick={extract} loading={processing}>
          提取文本
        </Button>
        {extractedText.length > 0 && (
          <Button icon={<FileWordOutlined />} onClick={saveAsWord} loading={processing}>
            保存为 Word
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

      {extractedText.length > 0 && (
        <Input.TextArea
          value={extractedText.join('\n\n--- 分页 ---\n\n')}
          readOnly
          autoSize={{ minRows: 8, maxRows: 20 }}
          style={{ fontFamily: 'monospace' }}
        />
      )}
    </div>
  )
}

export default PdfToWord
