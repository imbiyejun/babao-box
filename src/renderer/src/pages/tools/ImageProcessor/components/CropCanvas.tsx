import { useRef, useEffect, useCallback } from 'react'
import type { CropRegion, CropShape } from '@/types/image-process'

interface CropCanvasProps {
  image: HTMLImageElement
  cropRegion: CropRegion
  onCropChange: (region: CropRegion) => void
  shape: CropShape
  aspectRatio: number | null
}

type DragMode =
  | 'none'
  | 'move'
  | 'resize-tl'
  | 'resize-tr'
  | 'resize-bl'
  | 'resize-br'

const HANDLE_SIZE = 8
const MIN_CROP_SIZE = 10

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

function toCanvasCoords(region: CropRegion, s: ScaleInfo): CropRegion {
  return {
    x: region.x * s.scale + s.offsetX,
    y: region.y * s.scale + s.offsetY,
    width: region.width * s.scale,
    height: region.height * s.scale
  }
}

function toImageCoords(region: CropRegion, s: ScaleInfo): CropRegion {
  return {
    x: Math.round((region.x - s.offsetX) / s.scale),
    y: Math.round((region.y - s.offsetY) / s.scale),
    width: Math.round(region.width / s.scale),
    height: Math.round(region.height / s.scale)
  }
}

function getHandlePositions(c: CropRegion) {
  return {
    tl: { x: c.x, y: c.y },
    tr: { x: c.x + c.width, y: c.y },
    bl: { x: c.x, y: c.y + c.height },
    br: { x: c.x + c.width, y: c.y + c.height }
  }
}

function hitTest(mx: number, my: number, c: CropRegion): DragMode {
  const handles = getHandlePositions(c)
  for (const [key, pos] of Object.entries(handles)) {
    if (Math.abs(mx - pos.x) <= HANDLE_SIZE && Math.abs(my - pos.y) <= HANDLE_SIZE) {
      return `resize-${key}` as DragMode
    }
  }
  if (mx >= c.x && mx <= c.x + c.width && my >= c.y && my <= c.y + c.height) {
    return 'move'
  }
  return 'none'
}

function getCursorForMode(mode: DragMode): string {
  switch (mode) {
    case 'resize-tl':
    case 'resize-br':
      return 'nwse-resize'
    case 'resize-tr':
    case 'resize-bl':
      return 'nesw-resize'
    case 'move':
      return 'move'
    default:
      return 'crosshair'
  }
}

export default function CropCanvas({
  image,
  cropRegion,
  onCropChange,
  shape,
  aspectRatio
}: CropCanvasProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef<ScaleInfo>({ scale: 1, offsetX: 0, offsetY: 0, displayW: 0, displayH: 0 })
  const dragRef = useRef<{
    mode: DragMode
    startX: number
    startY: number
    startCrop: CropRegion
  }>({ mode: 'none', startX: 0, startY: 0, startCrop: { x: 0, y: 0, width: 0, height: 0 } })

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cw = canvas.width
    const ch = canvas.height
    ctx.clearRect(0, 0, cw, ch)

    const s = scaleRef.current
    ctx.drawImage(image, s.offsetX, s.offsetY, s.displayW, s.displayH)

    const crop = toCanvasCoords(cropRegion, s)

    // Overlay
    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    if (shape === 'rectangle') {
      ctx.fillRect(0, 0, cw, crop.y)
      ctx.fillRect(0, crop.y + crop.height, cw, ch - crop.y - crop.height)
      ctx.fillRect(0, crop.y, crop.x, crop.height)
      ctx.fillRect(crop.x + crop.width, crop.y, cw - crop.x - crop.width, crop.height)

      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.strokeRect(crop.x, crop.y, crop.width, crop.height)

      // Rule of thirds grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 1; i <= 2; i++) {
        ctx.moveTo(crop.x, crop.y + (crop.height * i) / 3)
        ctx.lineTo(crop.x + crop.width, crop.y + (crop.height * i) / 3)
        ctx.moveTo(crop.x + (crop.width * i) / 3, crop.y)
        ctx.lineTo(crop.x + (crop.width * i) / 3, crop.y + crop.height)
      }
      ctx.stroke()
    } else {
      const cx = crop.x + crop.width / 2
      const cy = crop.y + crop.height / 2
      const r = Math.min(crop.width, crop.height) / 2

      ctx.fillRect(0, 0, cw, ch)
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()

      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.restore()

    // Corner handles
    const handles = getHandlePositions(crop)
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#1677ff'
    ctx.lineWidth = 1.5
    for (const pos of Object.values(handles)) {
      ctx.fillRect(pos.x - HANDLE_SIZE / 2, pos.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE)
      ctx.strokeRect(pos.x - HANDLE_SIZE / 2, pos.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE)
    }
  }, [image, cropRegion, shape])

  // Resize observer to keep canvas sized to container
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

  // Redraw when crop/shape changes
  useEffect(() => {
    draw()
  }, [draw])

  const clampCrop = useCallback(
    (c: CropRegion): CropRegion => {
      const s = scaleRef.current
      const imgBounds = { x: s.offsetX, y: s.offsetY, w: s.displayW, h: s.displayH }
      const clamped = { ...c }

      clamped.width = Math.max(clamped.width, MIN_CROP_SIZE)
      clamped.height = Math.max(clamped.height, MIN_CROP_SIZE)

      if (clamped.x < imgBounds.x) clamped.x = imgBounds.x
      if (clamped.y < imgBounds.y) clamped.y = imgBounds.y
      if (clamped.x + clamped.width > imgBounds.x + imgBounds.w)
        clamped.x = imgBounds.x + imgBounds.w - clamped.width
      if (clamped.y + clamped.height > imgBounds.y + imgBounds.h)
        clamped.y = imgBounds.y + imgBounds.h - clamped.height

      // Final safety clamp
      clamped.x = Math.max(clamped.x, imgBounds.x)
      clamped.y = Math.max(clamped.y, imgBounds.y)
      clamped.width = Math.min(clamped.width, imgBounds.x + imgBounds.w - clamped.x)
      clamped.height = Math.min(clamped.height, imgBounds.y + imgBounds.h - clamped.y)

      return clamped
    },
    []
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const s = scaleRef.current
      const canvasCrop = toCanvasCoords(cropRegion, s)
      const mode = hitTest(mx, my, canvasCrop)

      dragRef.current = {
        mode,
        startX: mx,
        startY: my,
        startCrop: { ...canvasCrop }
      }
    },
    [cropRegion]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const s = scaleRef.current
      const drag = dragRef.current

      if (drag.mode === 'none') {
        const canvasCrop = toCanvasCoords(cropRegion, s)
        canvas.style.cursor = getCursorForMode(hitTest(mx, my, canvasCrop))
        return
      }

      const dx = mx - drag.startX
      const dy = my - drag.startY
      let newCrop: CropRegion

      if (drag.mode === 'move') {
        newCrop = {
          ...drag.startCrop,
          x: drag.startCrop.x + dx,
          y: drag.startCrop.y + dy
        }
      } else {
        newCrop = { ...drag.startCrop }
        const ar = shape === 'circle' ? 1 : aspectRatio

        switch (drag.mode) {
          case 'resize-br':
            newCrop.width = Math.max(MIN_CROP_SIZE, drag.startCrop.width + dx)
            newCrop.height = ar
              ? newCrop.width / ar
              : Math.max(MIN_CROP_SIZE, drag.startCrop.height + dy)
            break
          case 'resize-tl': {
            newCrop.width = Math.max(MIN_CROP_SIZE, drag.startCrop.width - dx)
            newCrop.height = ar
              ? newCrop.width / ar
              : Math.max(MIN_CROP_SIZE, drag.startCrop.height - dy)
            newCrop.x = drag.startCrop.x + drag.startCrop.width - newCrop.width
            newCrop.y = drag.startCrop.y + drag.startCrop.height - newCrop.height
            break
          }
          case 'resize-tr': {
            newCrop.width = Math.max(MIN_CROP_SIZE, drag.startCrop.width + dx)
            newCrop.height = ar
              ? newCrop.width / ar
              : Math.max(MIN_CROP_SIZE, drag.startCrop.height - dy)
            newCrop.y = drag.startCrop.y + drag.startCrop.height - newCrop.height
            break
          }
          case 'resize-bl': {
            newCrop.width = Math.max(MIN_CROP_SIZE, drag.startCrop.width - dx)
            newCrop.height = ar
              ? newCrop.width / ar
              : Math.max(MIN_CROP_SIZE, drag.startCrop.height + dy)
            newCrop.x = drag.startCrop.x + drag.startCrop.width - newCrop.width
            break
          }
        }
      }

      const clamped = clampCrop(newCrop)
      onCropChange(toImageCoords(clamped, s))
    },
    [cropRegion, onCropChange, aspectRatio, shape, clampCrop]
  )

  const handleMouseUp = useCallback(() => {
    dragRef.current.mode = 'none'
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, minHeight: 0, position: 'relative', background: '#1a1a1a', borderRadius: 8 }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  )
}
