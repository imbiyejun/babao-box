import { Button, Typography } from 'antd'
import { FilePdfOutlined, FolderOpenOutlined } from '@ant-design/icons'

const { Text } = Typography

interface Props {
  onOpen: () => void
  description?: string
}

function PdfEmptyState({ onOpen, description }: Props): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 48,
        background: '#fafafa',
        borderRadius: 8,
        border: '2px dashed #d9d9d9',
        cursor: 'pointer',
        minHeight: 260
      }}
      onClick={onOpen}
    >
      <FilePdfOutlined style={{ fontSize: 56, color: '#bfbfbf' }} />
      <Text type="secondary" style={{ marginTop: 16, fontSize: 15 }}>
        {description || '请先选择一个PDF文件'}
      </Text>
      <Button
        type="primary"
        icon={<FolderOpenOutlined />}
        style={{ marginTop: 16 }}
        onClick={(e) => {
          e.stopPropagation()
          onOpen()
        }}
      >
        选择PDF文件
      </Button>
    </div>
  )
}

export default PdfEmptyState
