import { useState, useCallback } from 'react'
import { Button, Space, InputNumber, message, List, Radio, Typography, Divider } from 'antd'
import { ScissorOutlined, PlusOutlined, DeleteOutlined, ReloadOutlined, FolderOpenOutlined } from '@ant-design/icons'
import type { PdfFileData, PdfSplitRange } from '@/types/pdf'
import { getStemName } from '../constants'
import PdfEmptyState from './PdfEmptyState'

const { Text } = Typography

interface Props {
  pdfData: PdfFileData | null
  onOpenPdf: () => void
  onReset: () => void
}

type SplitMode = 'range' | 'every'

function PdfSplit({ pdfData, onOpenPdf, onReset }: Props): React.ReactElement {
  const [mode, setMode] = useState<SplitMode>('every')
  const [everyN, setEveryN] = useState(1)
  const [ranges, setRanges] = useState<PdfSplitRange[]>([{ start: 1, end: 1 }])
  const [processing, setProcessing] = useState(false)

  const reset = useCallback(() => {
    setMode('every')
    setEveryN(1)
    setRanges([{ start: 1, end: 1 }])
    onReset()
  }, [onReset])

  const addRange = useCallback(() => {
    setRanges((prev) => [...prev, { start: 1, end: pdfData?.pageCount || 1 }])
  }, [pdfData])

  const removeRange = useCallback((index: number) => {
    setRanges((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updateRange = useCallback((index: number, field: 'start' | 'end', value: number) => {
    setRanges((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }, [])

  const buildRanges = useCallback((): PdfSplitRange[] => {
    if (!pdfData) return []
    if (mode === 'every') {
      const result: PdfSplitRange[] = []
      for (let i = 0; i < pdfData.pageCount; i += everyN) {
        result.push({
          start: i,
          end: Math.min(i + everyN - 1, pdfData.pageCount - 1)
        })
      }
      return result
    }
    return ranges.map((r) => ({ start: r.start - 1, end: r.end - 1 }))
  }, [pdfData, mode, everyN, ranges])

  const split = useCallback(async () => {
    if (!pdfData) return
    const splitRanges = buildRanges()
    if (splitRanges.length === 0) return

    const dirResult = await window.electronAPI.selectDirectory()
    if (dirResult.canceled || !dirResult.filePaths.length) return
    const dir = dirResult.filePaths[0]

    setProcessing(true)
    try {
      const results = await window.electronAPI.pdfSplit(pdfData.filePath, splitRanges)
      const stem = getStemName(pdfData.fileName)
      for (let i = 0; i < results.length; i++) {
        const filePath = `${dir}\\${stem}_part${i + 1}.pdf`
        await window.electronAPI.writeFile(filePath, results[i])
      }
      message.success(`已拆分为 ${results.length} 个文件，保存到 ${dir}`)
    } catch (e) {
      message.error('拆分失败: ' + String(e))
    } finally {
      setProcessing(false)
    }
  }, [pdfData, buildRanges])

  if (!pdfData) return <PdfEmptyState onOpen={onOpenPdf} description="选择PDF文件，按页拆分为多个文件" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Space wrap>
        <Text>
          当前文件共 <Text strong>{pdfData.pageCount}</Text> 页
        </Text>
        <Divider type="vertical" />
        <Button icon={<FolderOpenOutlined />} onClick={onOpenPdf}>
          更换文件
        </Button>
        <Button icon={<ReloadOutlined />} onClick={reset}>
          重置
        </Button>
      </Space>

      <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)}>
        <Radio.Button value="every">按固定页数拆分</Radio.Button>
        <Radio.Button value="range">按自定义范围拆分</Radio.Button>
      </Radio.Group>

      {mode === 'every' && (
        <Space>
          <span>每</span>
          <InputNumber
            min={1}
            max={pdfData.pageCount}
            value={everyN}
            onChange={(v) => setEveryN(v || 1)}
          />
          <span>页拆分一个文件</span>
        </Space>
      )}

      {mode === 'range' && (
        <>
          <List
            size="small"
            bordered
            dataSource={ranges}
            renderItem={(item, index) => (
              <List.Item
                actions={[
                  <Button
                    key="del"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeRange(index)}
                    disabled={ranges.length <= 1}
                  />
                ]}
              >
                <Space>
                  <span>第</span>
                  <InputNumber
                    min={1}
                    max={pdfData.pageCount}
                    value={item.start}
                    onChange={(v) => updateRange(index, 'start', v || 1)}
                    size="small"
                  />
                  <span>页 至 第</span>
                  <InputNumber
                    min={item.start}
                    max={pdfData.pageCount}
                    value={item.end}
                    onChange={(v) => updateRange(index, 'end', v || item.start)}
                    size="small"
                  />
                  <span>页</span>
                </Space>
              </List.Item>
            )}
          />
          <Button icon={<PlusOutlined />} onClick={addRange} style={{ width: 'fit-content' }}>
            添加范围
          </Button>
        </>
      )}

      <Button
        type="primary"
        icon={<ScissorOutlined />}
        onClick={split}
        loading={processing}
        style={{ width: 'fit-content' }}
      >
        开始拆分
      </Button>
    </div>
  )
}

export default PdfSplit
