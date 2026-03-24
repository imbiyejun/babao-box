import { useCallback } from 'react'
import { Layout, Button, Space, Typography, Tabs, Spin } from 'antd'
import { ArrowLeftOutlined, FolderOpenOutlined, PictureOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useImageFile } from './hooks/useImageFile'
import ImageCrop from './components/ImageCrop'
import ImageWatermark from './components/ImageWatermark'
import ImageRemoveWatermark from './components/ImageRemoveWatermark'
import ImageCompress from './components/ImageCompress'
import ImageConvert from './components/ImageConvert'

const { Header, Content } = Layout
const { Text } = Typography

function ImageProcessor(): React.ReactElement {
  const navigate = useNavigate()
  const { imageData, loading, openImage, loadFromDrop } = useImageFile()

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const tabItems = imageData
    ? [
        { key: 'crop', label: '图片剪裁', children: <ImageCrop imageData={imageData} /> },
        { key: 'watermark', label: '图片水印', children: <ImageWatermark imageData={imageData} /> },
        { key: 'remove-watermark', label: '去除水印', children: <ImageRemoveWatermark imageData={imageData} /> },
        { key: 'compress', label: '图片压缩', children: <ImageCompress imageData={imageData} /> },
        { key: 'convert', label: '格式转换', children: <ImageConvert imageData={imageData} /> }
      ]
    : []

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
            图片处理
          </Typography.Title>
          {imageData && (
            <Text type="secondary" style={{ marginLeft: 12 }}>
              {imageData.fileName} ({imageData.element.naturalWidth}×{imageData.element.naturalHeight})
            </Text>
          )}
        </Space>
        <Button icon={<FolderOpenOutlined />} onClick={openImage} loading={loading}>
          打开图片
        </Button>
      </Header>

      <Content
        style={{ padding: 24, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
        onDragOver={handleDragOver}
        onDrop={loadFromDrop}
      >
        {loading && (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Spin size="large" />
          </div>
        )}

        {!loading && !imageData && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              background: '#fff',
              borderRadius: 8,
              border: '2px dashed #d9d9d9',
              cursor: 'pointer',
              minHeight: 400
            }}
            onClick={openImage}
          >
            <PictureOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />
            <Text type="secondary" style={{ marginTop: 16, fontSize: 16 }}>
              点击选择或拖拽图片到此处
            </Text>
            <Text type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
              支持 PNG, JPG, WebP, BMP, GIF 等格式
            </Text>
          </div>
        )}

        {!loading && imageData && (
          <Tabs
            defaultActiveKey="crop"
            items={tabItems}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            tabBarStyle={{ marginBottom: 16 }}
            className="image-processor-tabs"
          />
        )}
      </Content>
    </Layout>
  )
}

export default ImageProcessor
