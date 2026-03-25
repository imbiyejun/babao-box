import { useState, useCallback } from 'react'
import { Button, List, Space, message, Typography } from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MergeCellsOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { PDF_SAVE_FILTERS, formatFileSize } from '../constants'

const { Text } = Typography

interface FileItem {
  path: string
  name: string
  size: number
}

function PdfMerge(): React.ReactElement {
  const [files, setFiles] = useState<FileItem[]>([])
  const [processing, setProcessing] = useState(false)

  const reset = useCallback(() => {
    setFiles([])
  }, [])

  const addFiles = useCallback(async () => {
    const result = await window.electronAPI.selectPdfFiles()
    if (result.canceled || !result.filePaths.length) return

    const newFiles: FileItem[] = []
    for (const fp of result.filePaths) {
      try {
        const info = await window.electronAPI.pdfGetInfo(fp)
        newFiles.push({
          path: fp,
          name: fp.split(/[/\\]/).pop() || '',
          size: info.fileSize
        })
      } catch {
        message.warning(`无法读取: ${fp}`)
      }
    }
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const moveFile = useCallback((index: number, direction: -1 | 1) => {
    setFiles((prev) => {
      const next = [...prev]
      const target = index + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }, [])

  const merge = useCallback(async () => {
    if (files.length < 2) {
      message.warning('至少需要2个PDF文件')
      return
    }

    const result = await window.electronAPI.saveFileDialog('merged.pdf', PDF_SAVE_FILTERS)
    if (result.canceled || !result.filePath) return

    setProcessing(true)
    try {
      const merged = await window.electronAPI.pdfMerge(files.map((f) => f.path))
      await window.electronAPI.writeFile(result.filePath, merged)
      message.success('PDF合并完成')
    } catch (e) {
      message.error('合并失败: ' + String(e))
    } finally {
      setProcessing(false)
    }
  }, [files])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Space>
        <Button icon={<PlusOutlined />} onClick={addFiles}>
          添加PDF文件
        </Button>
        <Button
          type="primary"
          icon={<MergeCellsOutlined />}
          onClick={merge}
          loading={processing}
          disabled={files.length < 2}
        >
          合并
        </Button>
        {files.length > 0 && (
          <Button icon={<ReloadOutlined />} onClick={reset}>
            重置
          </Button>
        )}
      </Space>

      <List
        bordered
        dataSource={files}
        locale={{ emptyText: '请添加需要合并的PDF文件' }}
        renderItem={(item, index) => (
          <List.Item
            actions={[
              <Button
                key="up"
                size="small"
                icon={<ArrowUpOutlined />}
                disabled={index === 0}
                onClick={() => moveFile(index, -1)}
              />,
              <Button
                key="down"
                size="small"
                icon={<ArrowDownOutlined />}
                disabled={index === files.length - 1}
                onClick={() => moveFile(index, 1)}
              />,
              <Button
                key="del"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => removeFile(index)}
              />
            ]}
          >
            <List.Item.Meta
              title={item.name}
              description={
                <Text type="secondary">{formatFileSize(item.size)}</Text>
              }
            />
          </List.Item>
        )}
      />
    </div>
  )
}

export default PdfMerge
