import { useState } from 'react'
import { Layout, Button, Space, Typography, Tabs, Spin } from 'antd'
import { ArrowLeftOutlined, FolderOpenOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { usePdfFile } from './hooks/usePdfFile'
import { formatFileSize } from './constants'
import PdfToImage from './components/PdfToImage'
import PdfToWord from './components/PdfToWord'
import PdfMerge from './components/PdfMerge'
import PdfSplit from './components/PdfSplit'
import PdfCompress from './components/PdfCompress'
import PdfWatermark from './components/PdfWatermark'

const { Header, Content } = Layout
const { Text } = Typography

function PdfProcessor(): React.ReactElement {
  const navigate = useNavigate()
  const { pdfData, loading, openPdf, resetPdf } = usePdfFile()
  const [activeTab, setActiveTab] = useState('to-image')

  const tabItems = [
    { key: 'to-image', label: 'PDF转图片', children: <PdfToImage pdfData={pdfData} onOpenPdf={openPdf} onReset={resetPdf} /> },
    { key: 'to-word', label: 'PDF转Word', children: <PdfToWord pdfData={pdfData} onOpenPdf={openPdf} onReset={resetPdf} /> },
    { key: 'merge', label: 'PDF合并', children: <PdfMerge /> },
    { key: 'split', label: 'PDF拆分', children: <PdfSplit pdfData={pdfData} onOpenPdf={openPdf} onReset={resetPdf} /> },
    { key: 'compress', label: 'PDF压缩', children: <PdfCompress pdfData={pdfData} onOpenPdf={openPdf} onReset={resetPdf} /> },
    { key: 'watermark', label: 'PDF水印', children: <PdfWatermark pdfData={pdfData} onOpenPdf={openPdf} onReset={resetPdf} /> }
  ]

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header
        style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
        }}
      >
        <Space>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} />
          <Typography.Title level={4} style={{ margin: 0 }}>
            PDF处理
          </Typography.Title>
          {pdfData && (
            <Space style={{ marginLeft: 12 }}>
              <Text type="secondary">
                {pdfData.fileName} · {pdfData.pageCount}页 · {formatFileSize(pdfData.fileSize)}
              </Text>
            </Space>
          )}
        </Space>
        <Button icon={<FolderOpenOutlined />} onClick={openPdf} loading={loading}>
          打开PDF
        </Button>
      </Header>

      <Content
        style={{ padding: 24, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'auto' }}
      >
        {loading && (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Spin size="large" />
          </div>
        )}

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          style={{
            flex: 1,
            background: '#fff',
            borderRadius: 8,
            padding: 16,
            display: loading ? 'none' : undefined
          }}
          tabBarStyle={{ marginBottom: 16 }}
        />
      </Content>
    </Layout>
  )
}

export default PdfProcessor
