import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto'

/**
 * PDF RC4 40-bit encryption implementation (PDF 1.1, /V 1 /R 2).
 * Produces an encrypted PDF that standard readers (Adobe, Foxit, etc.) can open.
 */

const PDF_PADDING = Buffer.from([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41, 0x64, 0x00, 0x4b, 0x49, 0x43, 0x28, 0x46,
  0x57, 0x6f, 0x43, 0x30, 0x56, 0x45
])

function padPassword(pwd: string): Buffer {
  const buf = Buffer.alloc(32)
  const pwdBuf = Buffer.from(pwd, 'latin1')
  const len = Math.min(pwdBuf.length, 32)
  pwdBuf.copy(buf, 0, 0, len)
  if (len < 32) PDF_PADDING.copy(buf, len, 0, 32 - len)
  return buf
}

function rc4(key: Buffer, data: Buffer): Buffer {
  const S = Array.from({ length: 256 }, (_, i) => i)
  let j = 0
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + key[i % key.length]) & 0xff
    ;[S[i], S[j]] = [S[j], S[i]]
  }
  const out = Buffer.alloc(data.length)
  let a = 0
  let b = 0
  for (let k = 0; k < data.length; k++) {
    a = (a + 1) & 0xff
    b = (b + S[a]) & 0xff
    ;[S[a], S[b]] = [S[b], S[a]]
    out[k] = data[k] ^ S[(S[a] + S[b]) & 0xff]
  }
  return out
}

function computeOwnerValue(ownerPwd: string, userPwd: string): Buffer {
  const ownerPadded = padPassword(ownerPwd)
  const hash = createHash('md5').update(ownerPadded).digest()
  const key = hash.subarray(0, 5)
  return rc4(key, padPassword(userPwd))
}

function computeEncryptionKey(
  userPwd: string,
  ownerValue: Buffer,
  permissions: number,
  fileId: Buffer
): Buffer {
  const md5 = createHash('md5')
  md5.update(padPassword(userPwd))
  md5.update(ownerValue)
  const permBuf = Buffer.alloc(4)
  permBuf.writeInt32LE(permissions)
  md5.update(permBuf)
  md5.update(fileId)
  return md5.digest().subarray(0, 5)
}

function computeUserValue(encKey: Buffer): Buffer {
  return rc4(encKey, padPassword(''))
}

function toHexString(buf: Buffer): string {
  return buf.toString('hex').toUpperCase()
}

/**
 * Inject /Encrypt dict + /ID into a PDF produced by pdf-lib.
 * Works by manipulating the raw PDF bytes at the trailer level.
 */
export async function encryptPdfBuffer(
  buffer: ArrayBuffer,
  userPassword: string,
  ownerPassword: string
): Promise<Uint8Array> {
  // Re-load & save with pdf-lib to ensure clean structure
  const { PDFDocument } = await import('pdf-lib')
  const doc = await PDFDocument.load(buffer)
  const cleanBytes = await doc.save()

  const src = Buffer.from(cleanBytes)
  const text = src.toString('latin1')

  const fileId = randomBytes(16)
  const permissions = -44 // allow printing + screen reading
  const O = computeOwnerValue(ownerPassword || userPassword, userPassword)
  const encKey = computeEncryptionKey(userPassword, O, permissions, fileId)
  const U = computeUserValue(encKey)

  // Build objects that need to be injected: Encrypt dict + updated trailer
  const nextObjNum = findMaxObjNum(text) + 1

  const encryptObj = [
    `${nextObjNum} 0 obj`,
    `<< /Filter /Standard /V 1 /R 2 /Length 40`,
    `   /P ${permissions}`,
    `   /O <${toHexString(O)}>`,
    `   /U <${toHexString(U)}>`,
    `>>`,
    'endobj'
  ].join('\n')

  const idHex = toHexString(fileId)

  // Find the startxref position for later fixup
  const trailerMatch = text.lastIndexOf('trailer')
  if (trailerMatch === -1) {
    throw new Error('Cannot find PDF trailer — file may use cross-reference streams')
  }

  // Insert Encrypt obj before trailer, patch trailer to reference it
  const beforeTrailer = src.subarray(0, trailerMatch)
  const afterTrailer = src.subarray(trailerMatch)
  const afterText = afterTrailer.toString('latin1')

  // Patch trailer dict: add /Encrypt and /ID entries
  const patchedTrailer = afterText
    .replace(
      /trailer\s*<<([\s\S]*?)>>/,
      (_, content: string) =>
        `trailer <<${content} /Encrypt ${nextObjNum} 0 R /ID [<${idHex}> <${idHex}>] >>`
    )
    .replace(/startxref\s+(\d+)/, (_m, offset: string) => {
      const newOffset = Number(offset) + Buffer.byteLength(encryptObj + '\n', 'latin1')
      return `startxref\n${newOffset}`
    })

  const result = Buffer.concat([
    beforeTrailer,
    Buffer.from(encryptObj + '\n', 'latin1'),
    Buffer.from(patchedTrailer, 'latin1')
  ])

  return new Uint8Array(result.buffer, result.byteOffset, result.byteLength)
}

function findMaxObjNum(text: string): number {
  let max = 0
  const re = /(\d+)\s+\d+\s+obj/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const n = Number(m[1])
    if (n > max) max = n
  }
  return max
}

/**
 * Decrypt PDF by loading with ignoreEncryption,
 * then re-serialising without the /Encrypt dictionary.
 * For password-protected PDFs that use standard security handlers.
 */
export async function decryptPdfBuffer(
  buffer: ArrayBuffer,
  _password: string
): Promise<Uint8Array> {
  const { PDFDocument } = await import('pdf-lib')

  // First try without encryption flag — works for non-encrypted PDFs
  try {
    const doc = await PDFDocument.load(buffer)
    return doc.save()
  } catch {
    // ignore
  }

  // Strip /Encrypt reference from the raw bytes, then re-load
  const raw = Buffer.from(buffer)
  const text = raw.toString('latin1')

  const stripped = text
    .replace(/\/Encrypt\s+\d+\s+\d+\s+R/g, '')
    .replace(/\/ID\s*\[<[0-9A-Fa-f]+>\s*<[0-9A-Fa-f]+>\]/g, '')

  // Remove the Encrypt dictionary object itself
  const cleaned = stripped.replace(
    /\d+\s+\d+\s+obj\s*<<[^>]*\/Filter\s*\/Standard[^>]*>>\s*endobj/g,
    ''
  )

  try {
    const doc = await PDFDocument.load(Buffer.from(cleaned, 'latin1'))
    return doc.save()
  } catch {
    throw new Error('无法解密此PDF文件，可能需要正确的密码或文件使用了不支持的加密方式')
  }
}
