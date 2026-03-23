import { HashRouter, Routes, Route } from 'react-router-dom'
import { Suspense } from 'react'
import { Spin } from 'antd'
import Home from './pages/Home'
import { tools } from './tools/registry'

function App(): React.ReactElement {
  return (
    <HashRouter>
      <Suspense
        fallback={
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100vh'
            }}
          >
            <Spin size="large" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Home />} />
          {tools.map((tool) => (
            <Route key={tool.id} path={tool.path} element={<tool.component />} />
          ))}
        </Routes>
      </Suspense>
    </HashRouter>
  )
}

export default App
