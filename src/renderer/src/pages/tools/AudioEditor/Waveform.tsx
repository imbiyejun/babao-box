import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import WaveSurfer from 'wavesurfer.js'
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js'
import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.esm.js'

export interface WaveformRef {
  playRegion: () => void
  zoomIn: () => void
  zoomOut: () => void
}

interface WaveformProps {
  url: string
  onReady: (ws: WaveSurfer) => void
  onDurationChange: (duration: number) => void
  onTimeUpdate: (time: number) => void
  onPlayChange: (isPlaying: boolean) => void
  onRegionUpdate: (region: { start: number; end: number }) => void
}

const ZOOM_STEP = 20
const ZOOM_MIN = 10
const ZOOM_MAX = 500
const INITIAL_ZOOM = 50

const Waveform = forwardRef<WaveformRef, WaveformProps>(
  ({ url, onReady, onDurationChange, onTimeUpdate, onPlayChange, onRegionUpdate }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const wsRef = useRef<WaveSurfer | null>(null)
    const regionRef = useRef<ReturnType<RegionsPlugin['addRegion']> | null>(null)
    const zoomLevel = useRef(INITIAL_ZOOM)

    useImperativeHandle(ref, () => ({
      playRegion: () => {
        regionRef.current?.play()
      },
      zoomIn: () => {
        zoomLevel.current = Math.min(zoomLevel.current + ZOOM_STEP, ZOOM_MAX)
        wsRef.current?.zoom(zoomLevel.current)
      },
      zoomOut: () => {
        zoomLevel.current = Math.max(zoomLevel.current - ZOOM_STEP, ZOOM_MIN)
        wsRef.current?.zoom(zoomLevel.current)
      }
    }))

    useEffect(() => {
      if (!containerRef.current) return
      let destroyed = false

      const ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: '#4a9eff',
        progressColor: '#1677ff',
        cursorColor: '#ff4d4f',
        cursorWidth: 2,
        height: 150,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        normalize: true
      })

      const regions = ws.registerPlugin(RegionsPlugin.create())
      ws.registerPlugin(
        TimelinePlugin.create({
          timeInterval: 1,
          primaryLabelInterval: 5,
          style: { fontSize: '12px', color: '#999' }
        })
      )

      // Allow drag-to-select on the waveform
      regions.enableDragSelection({ color: 'rgba(22, 119, 255, 0.15)' })

      ws.on('decode', () => {
        if (destroyed) return
        const duration = ws.getDuration()
        onDurationChange(duration)

        if (regionRef.current) {
          regionRef.current.remove()
        }

        regionRef.current = regions.addRegion({
          start: 0,
          end: duration,
          color: 'rgba(22, 119, 255, 0.15)',
          drag: true,
          resize: true
        })
      })

      // Keep only one region at a time
      regions.on('region-created', (region) => {
        if (destroyed) return
        if (regionRef.current && regionRef.current !== region) {
          regionRef.current.remove()
        }
        regionRef.current = region
        onRegionUpdate({ start: region.start, end: region.end })
      })

      regions.on('region-updated', (region) => {
        if (destroyed) return
        onRegionUpdate({ start: region.start, end: region.end })
      })

      ws.on('timeupdate', (time: number) => {
        if (!destroyed) onTimeUpdate(time)
      })
      ws.on('play', () => {
        if (!destroyed) onPlayChange(true)
      })
      ws.on('pause', () => {
        if (!destroyed) onPlayChange(false)
      })
      ws.on('finish', () => {
        if (!destroyed) onPlayChange(false)
      })

      ws.load(url)
      wsRef.current = ws
      onReady(ws)

      return () => {
        destroyed = true
        ws.destroy()
      }
      // Only re-create WaveSurfer when URL changes
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url])

    return (
      <div
        style={{
          background: '#1a1a2e',
          borderRadius: 8,
          padding: '20px 16px 8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden'
        }}
      >
        <div ref={containerRef} />
      </div>
    )
  }
)

Waveform.displayName = 'Waveform'

export default Waveform
