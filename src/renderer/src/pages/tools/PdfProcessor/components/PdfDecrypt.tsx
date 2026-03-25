import { useState, useCallback } from 'react'
import { Button, Input, message, Form, Typography, Tag, Space } from 'antd'
import { UnlockOutlined, ReloadOutlined, FolderOpenOutlined } from '@ant-design/icons'
import type { PdfFileData } from '@/types/pdf'
import { PDF_SAVE_FILTERS, getStemName } from '../constants'
import PdfEmptyState from './PdfEmptyState'

const { Text } = Typography

interface Props {
  pdfData: PdfFileData | null
  onOpenPdf: () => void
  onReset: () => void
}

function PdfDecrypt({ pdfData, onOpenPdf, onReset }: Props): React.ReactElement {
  const [password, setPassword] = useState('')
  const [processing, setProcessing] = useState(false)

  const reset = useCallback(() => {
    setPassword('')
    onReset()
  }, [onReset])

  const decrypt = useCallback(async () => {
    if (!pdfData) return

    const stem = getStemName(pdfData.fileName)
    const result = await window.electronAPI.saveFileDialog(
      `${stem}_decrypted.pdf`,
      PDF_SAVE_FILTERS
    )
    if (result.canceled || !result.filePath) return

    setProcessing(true)
    try {
      const decrypted = await window.electronAPI.pdfDecrypt(pdfData.filePath, password)
      await window.electronAPI.writeFile(result.filePath, decrypted)
      message.success('PDF解密完成')
    } catch (e) {
      message.error('解密失败: ' + String(e))
    } finally {
      setProcessing(false)
    }
  }, [pdfData, password])

  if (!pdfData) return <PdfEmptyState onOpen={onOpenPdf} description="选择需要解密的PDF文件" />

  return (
    <div style={{ maxWidth: 480 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<FolderOpenOutlined />} onClick={onOpenPdf}>
          更换文件
        </Button>
        <Button icon={<ReloadOutlined />} onClick={reset}>
          重置
        </Button>
      </Space>

      <Form layout="vertical">
        <Form.Item>
          {pdfData.encrypted ? (
            <Tag color="orange">此文件已加密</Tag>
          ) : (
            <Tag color="green">此文件未加密</Tag>
          )}
        </Form.Item>
        <Form.Item label="输入密码">
          <Input.Password
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入PDF密码"
          />
        </Form.Item>
        <Form.Item>
          <Text type="secondary">
            解密后将生成一个不需要密码即可打开的PDF文件
          </Text>
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            icon={<UnlockOutlined />}
            onClick={decrypt}
            loading={processing}
          >
            解密并保存
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}

export default PdfDecrypt
