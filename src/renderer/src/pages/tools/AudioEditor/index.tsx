import { useState, useRef, useCallback } from 'react'
import { Layout, Button, Space, Typography, message } from 'antd'
import { ArrowLeftOutlined, FolderOpenOutlined, SaveOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type WaveSurfer from 'wavesurfer.js'
import Waveform from './Waveform'
import type { WaveformRef } from './Waveform'
import Controls from './Controls'
import { trimAudioBuffer, audioBufferToWav } from '@/utils/audio'

const { Header, Content } = Layout
const { Text } = Typography

interface RegionRange {
  start: number
  end: number
}

function AudioEditor(): React.ReactElement {
  const navigate = useNavigate()
  const wsRef = useRef<WaveSurfer | null>(null)
  const waveformRef = useRef<WaveformRef>(null)
  const [fileName, setFileName] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [region, setRegion] = useState<RegionRange>({ start: 0, end: 0 })
  const [loading, setLoading] = useState(false)

  const loadFile = useCallback(
    async (path: string, name: string) => {
      setLoading(true)
      try {
        const buffer = await window.electronAPI.readFile(path)
        const blob = new Blob([buffer])
        const url = URL.createObjectURL(blob)
        if (audioUrl) URL.revokeObjectURL(audioUrl)
        setAudioUrl(url)
        setFileName(name)
        setCurrentTime(0)
        setIsPlaying(false)
      } catch (err) {
        message.error('文件加载失败: ' + (err instanceof Error ? err.message : String(err)))
      } finally {
        setLoading(false)
      }
    },
    [audioUrl]
  )

  const handleOpenFile = useCallback(async () => {
    const result = await window.electronAPI.openFileDialog()
    if (!result.canceled && result.filePaths.length > 0) {
      const fp = result.filePaths[0]
      const name = fp.split(/[/\\]/).pop() || ''
      await loadFile(fp, name)
    }
  }, [loadFile])

  const handleSave = useCallback(async () => {
    const ws = wsRef.current
    if (!ws) return

    const decodedData = ws.getDecodedData()
    if (!decodedData) {
      message.error('音频数据未就绪')
      return
    }

    const baseName = fileName.replace(/\.[^.]+$/, '')
    const result = await window.electronAPI.saveFileDialog(`${baseName}_trimmed.wav`)
    if (result.canceled || !result.filePath) return

    setLoading(true)
    try {
      const trimmed = trimAudioBuffer(decodedData, region.start, region.end)
      const wavData = audioBufferToWav(trimmed)
      await window.electronAPI.writeFile(result.filePath, wavData)
      message.success('保存成功')
    } catch (err) {
      message.error('保存失败: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }, [fileName, region])

  const handleWsReady = useCallback((ws: WaveSurfer) => {
    wsRef.current = ws
  }, [])

  const handlePlayPause = useCallback(() => {
    wsRef.current?.playPause()
  }, [])

  const handlePlayRegion = useCallback(() => {
    waveformRef.current?.playRegion()
  }, [])

  const handleZoomIn = useCallback(() => {
    waveformRef.current?.zoomIn()
  }, [])

  const handleZoomOut = useCallback(() => {
    waveformRef.current?.zoomOut()
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (!file) return
      const path = (file as File & { path: string }).path
      if (path) {
        await loadFile(path, file.name)
      }
    },
    [loadFile]
  )

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
            音频剪辑
          </Typography.Title>
          {fileName && (
            <Text type="secondary" style={{ marginLeft: 12 }}>
              {fileName}
            </Text>
          )}
        </Space>
        <Space>
          <Button icon={<FolderOpenOutlined />} onClick={handleOpenFile}>
            打开文件
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            disabled={!audioUrl}
            loading={loading}
          >
            保存剪辑
          </Button>
        </Space>
      </Header>

      <Content
        style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {!audioUrl ? (
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
            onClick={handleOpenFile}
          >
            <FolderOpenOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />
            <Text type="secondary" style={{ marginTop: 16, fontSize: 16 }}>
              点击选择或拖拽音频文件到此处
            </Text>
            <Text type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
              支持 MP3, WAV, OGG, FLAC, AAC, M4A 等格式
            </Text>
          </div>
        ) : (
          <>
            <Waveform
              ref={waveformRef}
              url={audioUrl}
              onReady={handleWsReady}
              onDurationChange={(d) => {
                setDuration(d)
                setRegion({ start: 0, end: d })
              }}
              onTimeUpdate={setCurrentTime}
              onPlayChange={setIsPlaying}
              onRegionUpdate={setRegion}
            />
            <Controls
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              regionStart={region.start}
              regionEnd={region.end}
              onPlayPause={handlePlayPause}
              onPlayRegion={handlePlayRegion}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
            />
          </>
        )}
      </Content>
    </Layout>
  )
}

export default AudioEditor
