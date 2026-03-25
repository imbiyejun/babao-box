import { useState, useCallback } from 'react'
import { Button, Input, message, Form, Typography, Space, Divider } from 'antd'
import { LockOutlined, ReloadOutlined, FolderOpenOutlined } from '@ant-design/icons'
import type { PdfFileData } from '@/types/pdf'
import { PDF_SAVE_FILTERS, getStemName } from '../constants'
import PdfEmptyState from './PdfEmptyState'

const { Text } = Typography

interface Props {
  pdfData: PdfFileData | null
  onOpenPdf: () => void
  onReset: () => void
}

function PdfEncrypt({ pdfData, onOpenPdf, onReset }: Props): React.ReactElement {
  const [userPassword, setUserPassword] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [processing, setProcessing] = useState(false)

  const reset = useCallback(() => {
    setUserPassword('')
    setOwnerPassword('')
    onReset()
  }, [onReset])

  const encrypt = useCallback(async () => {
    if (!pdfData) return
    if (!userPassword) {
      message.warning('请输入用户密码')
      return
    }

    const stem = getStemName(pdfData.fileName)
    const result = await window.electronAPI.saveFileDialog(
      `${stem}_encrypted.pdf`,
      PDF_SAVE_FILTERS
    )
    if (result.canceled || !result.filePath) return

    setProcessing(true)
    try {
      const encrypted = await window.electronAPI.pdfEncrypt(
        pdfData.filePath,
        userPassword,
        ownerPassword || userPassword
      )
      await window.electronAPI.writeFile(result.filePath, encrypted)
      message.success('PDF加密完成')
    } catch (e) {
      message.error('加密失败: ' + String(e))
    } finally {
      setProcessing(false)
    }
  }, [pdfData, userPassword, ownerPassword])

  if (!pdfData) return <PdfEmptyState onOpen={onOpenPdf} description="选择PDF文件进行加密" />

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
        <Form.Item label="用户密码（打开文档时需要输入）" required>
          <Input.Password
            value={userPassword}
            onChange={(e) => setUserPassword(e.target.value)}
            placeholder="请输入用户密码"
          />
        </Form.Item>
        <Form.Item label="所有者密码（可选，用于限制编辑权限）">
          <Input.Password
            value={ownerPassword}
            onChange={(e) => setOwnerPassword(e.target.value)}
            placeholder="留空则与用户密码相同"
          />
        </Form.Item>
        <Form.Item>
          <Text type="secondary">
            加密后的PDF需要输入用户密码才能打开查看
          </Text>
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            icon={<LockOutlined />}
            onClick={encrypt}
            loading={processing}
            disabled={!userPassword}
          >
            加密并保存
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}

export default PdfEncrypt
