import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'

interface WatermarkOptions {
  text: string
  fontSize: number
  opacity: number
  rotation: number
  color: { r: number; g: number; b: number }
  position: 'center' | 'tile'
}

const CJK_FONT_PATHS = [
  'C:\\Windows\\Fonts\\simhei.ttf',
  'C:\\Windows\\Fonts\\msyh.ttf',
  'C:\\Windows\\Fonts\\simkai.ttf'
]

function hasCjk(text: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf]/u.test(text)
}

async function loadCjkFont(): Promise<Uint8Array | null> {
  for (const fp of CJK_FONT_PATHS) {
    if (existsSync(fp)) {
      return readFile(fp)
    }
  }
  return null
}

export async function getPdfInfo(
  buffer: ArrayBuffer
): Promise<{ pageCount: number; fileSize: number; encrypted: boolean }> {
  try {
    const doc = await PDFDocument.load(buffer)
    return { pageCount: doc.getPageCount(), fileSize: buffer.byteLength, encrypted: false }
  } catch {
    try {
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true })
      return { pageCount: doc.getPageCount(), fileSize: buffer.byteLength, encrypted: true }
    } catch {
      throw new Error('无法读取PDF文件')
    }
  }
}

export async function mergePdfs(buffers: ArrayBuffer[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create()
  for (const buffer of buffers) {
    const doc = await PDFDocument.load(buffer)
    const pages = await merged.copyPages(doc, doc.getPageIndices())
    for (const page of pages) merged.addPage(page)
  }
  return merged.save()
}

export async function splitPdf(
  buffer: ArrayBuffer,
  ranges: { start: number; end: number }[]
): Promise<Uint8Array[]> {
  const source = await PDFDocument.load(buffer)
  const total = source.getPageCount()
  const results: Uint8Array[] = []

  for (const range of ranges) {
    const doc = await PDFDocument.create()
    const indices: number[] = []
    for (let i = range.start; i <= Math.min(range.end, total - 1); i++) {
      indices.push(i)
    }
    if (indices.length === 0) continue
    const pages = await doc.copyPages(source, indices)
    for (const page of pages) doc.addPage(page)
    results.push(await doc.save())
  }

  return results
}

export async function compressPdf(buffer: ArrayBuffer): Promise<Uint8Array> {
  const doc = await PDFDocument.load(buffer)
  // Remove metadata to further reduce size
  doc.setTitle('')
  doc.setAuthor('')
  doc.setSubject('')
  doc.setKeywords([])
  doc.setProducer('')
  doc.setCreator('')
  return doc.save({ useObjectStreams: true })
}

// Encrypt via RC4 40-bit (PDF 1.1 standard, widest compatibility)
export async function encryptPdf(
  buffer: ArrayBuffer,
  userPassword: string,
  ownerPassword: string
): Promise<Uint8Array> {
  const { encryptPdfBuffer } = await import('./pdfCrypto')
  return encryptPdfBuffer(buffer, userPassword, ownerPassword)
}

export async function decryptPdf(buffer: ArrayBuffer, password: string): Promise<Uint8Array> {
  const { decryptPdfBuffer } = await import('./pdfCrypto')
  return decryptPdfBuffer(buffer, password)
}

export async function addWatermark(
  buffer: ArrayBuffer,
  options: WatermarkOptions
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(buffer)

  let font
  if (hasCjk(options.text)) {
    doc.registerFontkit(fontkit)
    const cjkBytes = await loadCjkFont()
    if (cjkBytes) {
      font = await doc.embedFont(cjkBytes, { subset: true })
    } else {
      font = await doc.embedFont(StandardFonts.Helvetica)
    }
  } else {
    font = await doc.embedFont(StandardFonts.Helvetica)
  }

  const { r, g, b } = options.color
  const color = rgb(r, g, b)

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize()

    if (options.position === 'center') {
      const tw = font.widthOfTextAtSize(options.text, options.fontSize)
      page.drawText(options.text, {
        x: (width - tw) / 2,
        y: height / 2,
        size: options.fontSize,
        font,
        color,
        opacity: options.opacity,
        rotate: degrees(options.rotation)
      })
    } else {
      const gap = Math.max(options.fontSize * 8, 200)
      for (let x = 50; x < width; x += gap) {
        for (let y = 50; y < height; y += gap) {
          page.drawText(options.text, {
            x,
            y,
            size: options.fontSize,
            font,
            color,
            opacity: options.opacity,
            rotate: degrees(options.rotation)
          })
        }
      }
    }
  }

  return doc.save()
}
