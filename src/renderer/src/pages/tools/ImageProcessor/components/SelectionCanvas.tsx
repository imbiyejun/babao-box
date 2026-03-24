import { useRef, useEffect, useCallback } from 'react'
import type { SelectionRect } from '@/types/image-process'

interface SelectionCanvasProps {
  image: HTMLImageElement
  selections: SelectionRect[]
  onAddSelection: (rect: SelectionRect) => void
  previewImageData: ImageData | null
}

interface ScaleInfo {
  scale: number
  offsetX: number
  offsetY: number
  displayW: number
  displayH: number
}

function calcScale(image: HTMLImageElement, cw: number, ch: number): ScaleInfo {
  const scale = Math.min(cw / image.naturalWidth, ch / image.naturalHeight)
  const displayW = image.naturalWidth * scale
  const displayH = image.naturalHeight * scale
  return {
    scale,
    offsetX: (cw - displayW) / 2,
    offsetY: (ch - displayH) / 2,
    displayW,
    displayH
  }
}

export default function SelectionCanvas({
  image,
  selections,
  onAddSelection,
  previewImageData
}: SelectionCanvasProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef<ScaleInfo>({ scale: 1, offsetX: 0, offsetY: 0, displayW: 0, displayH: 0 })
  const drawingRef = useRef<{ active: boolean; startX: number; startY: number; curX: number; curY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    curX: 0,
    curY: 0
  })

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cw = canvas.width
    const ch = canvas.height
    ctx.clearRect(0, 0, cw, ch)

    const s = scaleRef.current

    if (previewImageData) {
      // Draw preview result scaled to canvas
      const tmpCanvas = document.createElement('canvas')
      tmpCanvas.width = previewImageData.width
      tmpCanvas.height = previewImageData.height
      tmpCanvas.getContext('2d')!.putImageData(previewImageData, 0, 0)
      ctx.drawImage(tmpCanvas, s.offsetX, s.offsetY, s.displayW, s.displayH)
    } else {
      ctx.drawImage(image, s.offsetX, s.offsetY, s.displayW, s.displayH)
    }

    // Draw existing selections
    ctx.save()
    for (const sel of selections) {
      const sx = sel.x * s.scale + s.offsetX
      const sy = sel.y * s.scale + s.offsetY
      const sw = sel.width * s.scale
      const sh = sel.height * s.scale

      ctx.fillStyle = 'rgba(255, 77, 79, 0.15)'
      ctx.fillRect(sx, sy, sw, sh)

      ctx.strokeStyle = '#ff4d4f'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 3])
      ctx.strokeRect(sx, sy, sw, sh)
    }
    ctx.setLineDash([])
    ctx.restore()

    // Draw in-progress selection
    const d = drawingRef.current
    if (d.active) {
      const rx = Math.min(d.startX, d.curX)
      const ry = Math.min(d.startY, d.curY)
      const rw = Math.abs(d.curX - d.startX)
      const rh = Math.abs(d.curY - d.startY)

      ctx.fillStyle = 'rgba(24, 144, 255, 0.15)'
      ctx.fillRect(rx, ry, rw, rh)
      ctx.strokeStyle = '#1677ff'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 3])
      ctx.strokeRect(rx, ry, rw, rh)
      ctx.setLineDash([])
    }
  }, [image, selections, previewImageData])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width === 0 || height === 0) return
      canvas.width = width
      canvas.height = height
      scaleRef.current = calcScale(image, width, height)
      draw()
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [image, draw])

  useEffect(() => {
    draw()
  }, [draw])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    drawingRef.current = { active: true, startX: mx, startY: my, curX: mx, curY: my }
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current.active) return
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      drawingRef.current.curX = e.clientX - rect.left
      drawingRef.current.curY = e.clientY - rect.top
      draw()
    },
    [draw]
  )

  const handleMouseUp = useCallback(() => {
    const d = drawingRef.current
    if (!d.active) return
    d.active = false

    const s = scaleRef.current
    const rx = Math.min(d.startX, d.curX)
    const ry = Math.min(d.startY, d.curY)
    const rw = Math.abs(d.curX - d.startX)
    const rh = Math.abs(d.curY - d.startY)

    // Minimum 5px canvas selection
    if (rw < 5 || rh < 5) {
      draw()
      return
    }

    // Convert to image coordinates
    const imgRect: SelectionRect = {
      x: Math.round((rx - s.offsetX) / s.scale),
      y: Math.round((ry - s.offsetY) / s.scale),
      width: Math.round(rw / s.scale),
      height: Math.round(rh / s.scale)
    }

    onAddSelection(imgRect)
  }, [onAddSelection, draw])

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, minHeight: 0, position: 'relative', background: '#1a1a1a', borderRadius: 8 }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', cursor: 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  )
}
