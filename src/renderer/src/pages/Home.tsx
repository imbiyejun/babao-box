import ToolCard from '../components/ToolCard'
import { tools } from '../tools/registry'

function Home(): React.ReactElement {
  return (
    <div style={{ padding: 32, minHeight: '100vh', background: '#f5f5f5' }}>
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
    </div>
  )
}

export default Home
