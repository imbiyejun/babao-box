import { Button, Space, Typography, Tooltip } from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  ZoomInOutlined,
  ZoomOutOutlined
} from '@ant-design/icons'
import { formatTime } from '@/utils/audio'

interface ControlsProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  regionStart: number
  regionEnd: number
  onPlayPause: () => void
  onPlayRegion: () => void
  onZoomIn: () => void
  onZoomOut: () => void
}

function Controls({
  isPlaying,
  currentTime,
  duration,
  regionStart,
  regionEnd,
  onPlayPause,
  onPlayRegion,
  onZoomIn,
  onZoomOut
}: ControlsProps): React.ReactElement {
  const regionDuration = regionEnd - regionStart

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 8,
        padding: 16,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space size="middle">
          <Tooltip title={isPlaying ? '暂停' : '播放'}>
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={onPlayPause}
            />
          </Tooltip>
          <Tooltip title="播放选区">
            <Button shape="circle" size="large" icon={<SoundOutlined />} onClick={onPlayRegion} />
          </Tooltip>
          <Typography.Text style={{ fontFamily: 'monospace', fontSize: 14 }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Typography.Text>
        </Space>
        <Space>
          <Tooltip title="放大波形">
            <Button icon={<ZoomInOutlined />} onClick={onZoomIn} />
          </Tooltip>
          <Tooltip title="缩小波形">
            <Button icon={<ZoomOutOutlined />} onClick={onZoomOut} />
          </Tooltip>
        </Space>
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 24 }}>
        <Typography.Text type="secondary">
          选区范围: {formatTime(regionStart)} - {formatTime(regionEnd)}
        </Typography.Text>
        <Typography.Text type="secondary">选区时长: {formatTime(regionDuration)}</Typography.Text>
      </div>
    </div>
  )
}

export default Controls
