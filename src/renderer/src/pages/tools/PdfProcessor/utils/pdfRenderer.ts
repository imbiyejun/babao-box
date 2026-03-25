import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'

// Configure worker for offline use — Vite resolves this to a bundled asset URL
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).href

export async function loadPdfDocument(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  return pdfjsLib.getDocument({ data }).promise
}

export async function renderPageToCanvas(
  pdf: PDFDocumentProxy,
  pageNum: number,
  scale: number = 2.0
): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageNum)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')!
  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas
}

export async function extractPageText(pdf: PDFDocumentProxy, pageNum: number): Promise<string> {
  const page = await pdf.getPage(pageNum)
  const content = await page.getTextContent()
  return content.items
    .filter((item): item is { str: string } & Record<string, unknown> => 'str' in item)
    .map((item) => item.str)
    .join(' ')
}

export async function extractAllText(pdf: PDFDocumentProxy): Promise<string[]> {
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    pages.push(await extractPageText(pdf, i))
  }
  return pages
}
