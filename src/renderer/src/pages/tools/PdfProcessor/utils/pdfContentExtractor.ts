import * as pdfjsLib from 'pdfjs-dist'
import type { PDFPageProxy } from 'pdfjs-dist'
import type {
  PdfTextRun,
  PdfTextLine,
  PdfExtractedImage,
  PdfPageContent,
  PdfToWordMode
} from '@/types/pdf'

const LINE_Y_TOLERANCE = 2
const MIN_IMAGE_PIXEL = 10
const MIN_IMAGE_DISPLAY_PT = 5

function isBoldFont(name: string): boolean {
  return /bold|black|heavy|demi/i.test(name)
}

function isItalicFont(name: string): boolean {
  return /italic|oblique|incline/i.test(name)
}

function getFontSize(transform: number[]): number {
  return Math.round(Math.abs(transform[3]) || Math.abs(transform[0]) || 12)
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) blob.arrayBuffer().then(resolve).catch(reject)
        else reject(new Error('Canvas toBlob failed'))
      },
      'image/png'
    )
  })
}

// --- Text extraction ---

interface RawTextItem {
  str: string
  transform: number[]
  width: number
  height: number
  fontName: string
}

export async function extractPageText(page: PDFPageProxy): Promise<PdfTextLine[]> {
  const content = await page.getTextContent()

  const items = content.items.filter(
    (item): item is RawTextItem =>
      'str' in item && typeof (item as RawTextItem).str === 'string' && (item as RawTextItem).str.trim().length > 0
  ) as RawTextItem[]

  if (items.length === 0) return []

  const styles = (content as Record<string, unknown>).styles as
    | Record<string, { fontFamily: string }>
    | undefined

  const lineMap = new Map<number, RawTextItem[]>()
  for (const item of items) {
    const y = Math.round(item.transform[5] / LINE_Y_TOLERANCE) * LINE_Y_TOLERANCE
    const bucket = lineMap.get(y)
    if (bucket) bucket.push(item)
    else lineMap.set(y, [item])
  }

  // Descending y = top of page first
  const sortedYs = [...lineMap.keys()].sort((a, b) => b - a)

  return sortedYs.map((y) => {
    const lineItems = lineMap.get(y)!
    lineItems.sort((a, b) => a.transform[4] - b.transform[4])

    const runs: PdfTextRun[] = lineItems.map((item) => {
      const styleFontFamily = styles?.[item.fontName]?.fontFamily || ''
      const combined = `${item.fontName} ${styleFontFamily}`
      return {
        text: item.str,
        fontSize: getFontSize(item.transform),
        isBold: isBoldFont(combined),
        isItalic: isItalicFont(combined),
        fontName: styleFontFamily || item.fontName
      }
    })

    return { y, runs }
  })
}

// --- Image extraction via CTM tracking ---

type Matrix6 = [number, number, number, number, number, number]

function matMul(m1: Matrix6, m2: Matrix6): Matrix6 {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
  ]
}

interface ImagePosition {
  name: string
  x: number
  y: number
  width: number
  height: number
}

// Track CTM through the operator list to locate images
async function findImagePositions(page: PDFPageProxy): Promise<ImagePosition[]> {
  const ops = await page.getOperatorList()
  const OPS = pdfjsLib.OPS

  const identity: Matrix6 = [1, 0, 0, 1, 0, 0]
  let ctm: Matrix6 = [...identity] as Matrix6
  const stack: Matrix6[] = []
  const results: ImagePosition[] = []

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i]
    const args = ops.argsArray[i]

    if (fn === OPS.save) {
      stack.push([...ctm] as Matrix6)
    } else if (fn === OPS.restore) {
      ctm = stack.pop() || ([...identity] as Matrix6)
    } else if (fn === OPS.transform) {
      ctm = matMul(ctm, [args[0], args[1], args[2], args[3], args[4], args[5]])
    } else if (fn === OPS.paintImageXObject || fn === OPS.paintJpegXObject) {
      const w = Math.sqrt(ctm[0] ** 2 + ctm[1] ** 2)
      const h = Math.sqrt(ctm[2] ** 2 + ctm[3] ** 2)

      if (w >= MIN_IMAGE_DISPLAY_PT && h >= MIN_IMAGE_DISPLAY_PT) {
        results.push({ name: args[0] as string, x: ctm[4], y: ctm[5], width: w, height: h })
      }
    }
  }

  return results
}

// Convert pdfjs internal image data to PNG
function rawImageToPng(imgObj: Record<string, unknown>): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const w = imgObj.width as number
    const h = imgObj.height as number
    if (!w || !h || w < MIN_IMAGE_PIXEL || h < MIN_IMAGE_PIXEL) {
      reject(new Error('Image too small'))
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!

    if (imgObj.data) {
      const src = imgObj.data as Uint8Array | Uint8ClampedArray
      const kind = (imgObj.kind as number) ?? 1
      let imageData: ImageData

      if (kind === 1 || src.length === w * h * 4) {
        imageData = new ImageData(new Uint8ClampedArray(src.buffer, src.byteOffset, w * h * 4), w, h)
      } else if (kind === 2 || src.length === w * h * 3) {
        imageData = ctx.createImageData(w, h)
        const dst = imageData.data
        let si = 0
        let di = 0
        const len = w * h
        for (let j = 0; j < len; j++) {
          dst[di++] = src[si++]
          dst[di++] = src[si++]
          dst[di++] = src[si++]
          dst[di++] = 255
        }
      } else {
        imageData = ctx.createImageData(w, h)
        const dst = imageData.data
        let si = 0
        let di = 0
        const len = w * h
        for (let j = 0; j < len; j++) {
          const v = src[si++]
          dst[di++] = v
          dst[di++] = v
          dst[di++] = v
          dst[di++] = 255
        }
      }
      ctx.putImageData(imageData, 0, 0)
    } else if (imgObj instanceof HTMLCanvasElement) {
      ctx.drawImage(imgObj, 0, 0)
    } else if ((imgObj as Record<string, unknown>).bitmap) {
      ctx.drawImage((imgObj as Record<string, unknown>).bitmap as ImageBitmap, 0, 0)
    } else {
      reject(new Error('Unsupported image format'))
      return
    }

    canvas.toBlob(
      (blob) => {
        if (blob) blob.arrayBuffer().then(resolve).catch(reject)
        else reject(new Error('toBlob failed'))
      },
      'image/png'
    )
  })
}

// Attempt to extract individual images from pdfjs page objects
async function extractImagesFromObjs(
  page: PDFPageProxy,
  positions: ImagePosition[]
): Promise<PdfExtractedImage[]> {
  const pageObjs = (page as Record<string, unknown>).objs as
    | { get?: (name: string) => Record<string, unknown> | null }
    | undefined
  if (!pageObjs?.get) return []

  const results: PdfExtractedImage[] = []

  for (const pos of positions) {
    try {
      const imgObj = pageObjs.get!(pos.name)
      if (!imgObj) continue

      const pngData = await rawImageToPng(imgObj)
      results.push({
        data: pngData,
        width: (imgObj.width as number) || pos.width,
        height: (imgObj.height as number) || pos.height,
        pageX: pos.x,
        pageY: pos.y,
        displayWidth: pos.width,
        displayHeight: pos.height
      })
    } catch {
      continue
    }
  }

  return results
}

// Render full page as a single PNG image
export async function renderPageImage(
  page: PDFPageProxy,
  scale: number = 2.0
): Promise<{ data: ArrayBuffer; width: number; height: number }> {
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')!
  await page.render({ canvasContext: ctx, viewport }).promise
  const data = await canvasToPng(canvas)
  return { data, width: viewport.width, height: viewport.height }
}

// Main entry: extract structured content from a single page
export async function extractPageContent(
  page: PDFPageProxy,
  pageIndex: number,
  mode: PdfToWordMode,
  imageScale: number = 2.0
): Promise<PdfPageContent> {
  const viewport = page.getViewport({ scale: 1 })
  const pageWidth = viewport.width
  const pageHeight = viewport.height

  if (mode === 'image') {
    const { data, width, height } = await renderPageImage(page, imageScale)
    return {
      pageIndex,
      pageWidth,
      pageHeight,
      textLines: [],
      images: [
        {
          data,
          width,
          height,
          pageX: 0,
          pageY: pageHeight,
          displayWidth: pageWidth,
          displayHeight: pageHeight
        }
      ]
    }
  }

  // Text mode: extract text and detect images in parallel
  const [textLines, imagePositions] = await Promise.all([
    extractPageText(page),
    findImagePositions(page)
  ])

  let images: PdfExtractedImage[] = []
  if (imagePositions.length > 0) {
    images = await extractImagesFromObjs(page, imagePositions)
  }

  return { pageIndex, pageWidth, pageHeight, textLines, images }
}
