import { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType } from 'docx'
import type {
  PdfPageContent,
  PdfTextLine,
  PdfTextRun as PdfTextRunType,
  PdfExtractedImage
} from '@/types/pdf'

// 1 PDF point = 20 twips
const PT_TO_TWIPS = 20
// 1 PDF point = 96/72 pixels at 96 DPI
const PT_TO_PX = 96 / 72

function toHalfPoints(fontSize: number): number {
  return Math.max(8, Math.round(fontSize * 2))
}

function buildTextRun(run: PdfTextRunType): TextRun {
  return new TextRun({
    text: run.text,
    bold: run.isBold || undefined,
    italics: run.isItalic || undefined,
    size: toHalfPoints(run.fontSize),
    font: run.fontName || undefined
  })
}

function buildTextParagraph(line: PdfTextLine, spacingBefore: number = 0): Paragraph {
  return new Paragraph({
    spacing: { before: spacingBefore, after: 0, line: 240 },
    children: line.runs.map(buildTextRun)
  })
}

function buildImageParagraph(image: PdfExtractedImage, maxContentWidthPt: number): Paragraph {
  let displayW = image.displayWidth * PT_TO_PX
  let displayH = image.displayHeight * PT_TO_PX

  const maxW = maxContentWidthPt * PT_TO_PX
  if (displayW > maxW && maxW > 0) {
    const ratio = maxW / displayW
    displayW = maxW
    displayH *= ratio
  }

  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 120 },
    children: [
      new ImageRun({
        data: new Uint8Array(image.data),
        transformation: {
          width: Math.round(displayW),
          height: Math.round(displayH)
        }
      })
    ]
  })
}

// Compute spacing between consecutive text lines
function calcSpacingBefore(prevY: number | null, line: PdfTextLine): number {
  if (prevY === null) return 0

  const gap = prevY - line.y
  if (gap <= 0) return 0

  const avgFontSize =
    line.runs.length > 0
      ? line.runs.reduce((s, r) => s + r.fontSize, 0) / line.runs.length
      : 12

  // Subtract expected single line height; remainder is extra spacing
  const extraGap = gap - avgFontSize * 1.15
  return Math.max(0, Math.round(extraGap * PT_TO_TWIPS))
}

interface ContentItem {
  type: 'text' | 'image'
  y: number
}

interface TextContentItem extends ContentItem {
  type: 'text'
  line: PdfTextLine
}

interface ImageContentItem extends ContentItem {
  type: 'image'
  image: PdfExtractedImage
}

type MergedItem = TextContentItem | ImageContentItem

function buildPageChildren(content: PdfPageContent): Paragraph[] {
  const { textLines, images, pageWidth } = content

  const isImageOnly = textLines.length === 0 && images.length > 0
  const marginPt = isImageOnly ? 18 : 54
  const contentWidthPt = pageWidth - marginPt * 2

  if (isImageOnly) {
    return images.map((img) => buildImageParagraph(img, contentWidthPt))
  }

  if (images.length === 0) {
    const paragraphs: Paragraph[] = []
    let prevY: number | null = null
    for (const line of textLines) {
      paragraphs.push(buildTextParagraph(line, calcSpacingBefore(prevY, line)))
      prevY = line.y
    }
    return paragraphs
  }

  // Mix text and images, sorted top-to-bottom (descending y)
  const items: MergedItem[] = [
    ...textLines.map(
      (line): TextContentItem => ({ type: 'text', y: line.y, line })
    ),
    ...images.map(
      (img): ImageContentItem => ({
        type: 'image',
        y: img.pageY + img.displayHeight,
        image: img
      })
    )
  ]
  items.sort((a, b) => b.y - a.y)

  const paragraphs: Paragraph[] = []
  let prevY: number | null = null

  for (const item of items) {
    if (item.type === 'text') {
      paragraphs.push(buildTextParagraph(item.line, calcSpacingBefore(prevY, item.line)))
      prevY = item.line.y
    } else {
      paragraphs.push(buildImageParagraph(item.image, contentWidthPt))
      prevY = item.y
    }
  }

  return paragraphs
}

export async function buildWordDocument(pages: PdfPageContent[]): Promise<Blob> {
  const sections = pages.map((content) => {
    const children = buildPageChildren(content)

    if (children.length === 0) {
      children.push(new Paragraph({ children: [] }))
    }

    const isImageOnly = content.textLines.length === 0 && content.images.length > 0
    const marginTwips = isImageOnly ? 360 : 1080

    return {
      properties: {
        page: {
          size: {
            width: Math.round(content.pageWidth * PT_TO_TWIPS),
            height: Math.round(content.pageHeight * PT_TO_TWIPS)
          },
          margin: {
            top: marginTwips,
            bottom: marginTwips,
            left: marginTwips,
            right: marginTwips
          }
        }
      },
      children
    }
  })

  const doc = new Document({ sections })
  return Packer.toBlob(doc)
}
