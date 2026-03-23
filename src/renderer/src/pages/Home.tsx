import { Layout, Typography, Space } from 'antd'
import { AppstoreOutlined } from '@ant-design/icons'
import ToolCard from '../components/ToolCard'
import { tools } from '../tools/registry'

const { Header, Content } = Layout
const { Title } = Typography

function Home(): React.ReactElement {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header
        style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
        }}
      >
        <Space>
          <AppstoreOutlined style={{ fontSize: 24, color: '#1677ff' }} />
          <Title level={3} style={{ margin: 0 }}>
            八宝盒
          </Title>
        </Space>
      </Header>
      <Content style={{ padding: 32 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          {tools.map((tool) => (
            <ToolCard
              key={tool.id}
              name={tool.name}
              description={tool.description}
              icon={tool.icon}
              path={tool.path}
            />
          ))}
        </div>
      </Content>
    </Layout>
  )
}

export default Home
