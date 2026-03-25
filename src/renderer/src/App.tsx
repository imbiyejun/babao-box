import { HashRouter, Routes, Route } from 'react-router-dom'
import { Suspense, useState, useEffect, useCallback } from 'react'
import { Spin } from 'antd'
import Home from './pages/Home'
import AboutModal from './components/AboutModal'
import { tools } from './tools/registry'

function App(): React.ReactElement {
  const [aboutOpen, setAboutOpen] = useState(false)
  const [aboutVersion, setAboutVersion] = useState('')

  const handleCloseAbout = useCallback(() => setAboutOpen(false), [])

  useEffect(() => {
    const cleanup = window.electronAPI.onShowAbout((version: string) => {
      setAboutVersion(version)
      setAboutOpen(true)
    })
    return cleanup
  }, [])

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
        <AboutModal open={aboutOpen} version={aboutVersion} onClose={handleCloseAbout} />
      </Suspense>
    </HashRouter>
  )
}

export default App
