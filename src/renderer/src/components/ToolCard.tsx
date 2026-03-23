import { Card, Typography } from 'antd'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

const { Text, Title } = Typography

interface ToolCardProps {
  name: string
  description: string
  icon: ReactNode
  path: string
}

function ToolCard({ name, description, icon, path }: ToolCardProps): React.ReactElement {
  const navigate = useNavigate()

  return (
    <Card
      hoverable
      onClick={() => navigate(path)}
      style={{ width: 200, textAlign: 'center' }}
      styles={{ body: { padding: '24px 16px' } }}
    >
      <div style={{ fontSize: 48, color: '#1677ff', marginBottom: 12 }}>{icon}</div>
      <Title level={5} style={{ marginBottom: 4 }}>
        {name}
      </Title>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {description}
      </Text>
    </Card>
  )
}

export default ToolCard
