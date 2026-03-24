import { createDecipheriv } from 'crypto'

// NCM file magic: "CTENFDAM"
const NCM_MAGIC = Buffer.from([0x43, 0x54, 0x45, 0x4e, 0x46, 0x44, 0x41, 0x4d])

// AES keys for NCM decryption (well-known constants, published in multiple open-source projects)
const CORE_KEY = Buffer.from('687A4852416D736F356B496E62617857', 'hex')
const META_KEY = Buffer.from('2331346C6A6B5F215C5D2630553C2728', 'hex')

export interface NcmMeta {
  format: string
  musicName?: string
  artist?: [string, number][]
  album?: string
  [key: string]: unknown
}

export interface NcmDecryptResult {
  /** Raw PCM / MP3 / FLAC bytes after decryption */
  audioData: Buffer
  /** Original format inside the container (mp3 | flac) */
  format: string
  meta: NcmMeta
}

function removePkcs7Padding(buf: Buffer): Buffer {
  const pad = buf[buf.length - 1]
  if (pad < 1 || pad > 16) return buf
  return buf.subarray(0, buf.length - pad)
}

function aesEcbDecrypt(data: Buffer, key: Buffer): Buffer {
  const decipher = createDecipheriv('aes-128-ecb', key, null)
  decipher.setAutoPadding(false)
  return Buffer.concat([decipher.update(data), decipher.final()])
}

/** Build NCM-variant RC4 keystream box from the decrypted content key. */
function buildKeyBox(key: Buffer): Uint8Array {
  const box = new Uint8Array(256)
  for (let i = 0; i < 256; i++) box[i] = i

  let j = 0
  for (let i = 0; i < 256; i++) {
    j = (j + box[i] + key[i % key.length]) & 0xff
    const t = box[i]
    box[i] = box[j]
    box[j] = t
  }
  return box
}

export function decryptNcmFile(fileBuffer: Buffer): NcmDecryptResult {
  let offset = 0

  // 1. Verify magic header
  if (fileBuffer.subarray(0, 8).compare(NCM_MAGIC) !== 0) {
    throw new Error('Not a valid NCM file')
  }
  offset = 10 // 8 bytes magic + 2 bytes gap

  // 2. Decrypt content key
  const keyLen = fileBuffer.readUInt32LE(offset)
  offset += 4
  const keyData = Buffer.from(fileBuffer.subarray(offset, offset + keyLen))
  offset += keyLen

  for (let i = 0; i < keyData.length; i++) keyData[i] ^= 0x64

  const decryptedKeyRaw = removePkcs7Padding(aesEcbDecrypt(keyData, CORE_KEY))
  // Remove "neteasecloudmusic" prefix (17 bytes)
  const contentKey = decryptedKeyRaw.subarray(17)

  // 3. Decrypt metadata
  const metaLen = fileBuffer.readUInt32LE(offset)
  offset += 4

  let meta: NcmMeta = { format: 'mp3' }
  if (metaLen > 0) {
    const metaData = Buffer.from(fileBuffer.subarray(offset, offset + metaLen))
    offset += metaLen

    for (let i = 0; i < metaData.length; i++) metaData[i] ^= 0x63

    // Remove "163 key(Don't modify):" prefix (22 bytes), base64 decode, AES decrypt
    const b64Str = metaData.subarray(22).toString('ascii')
    const metaEncrypted = Buffer.from(b64Str, 'base64')
    const metaDecrypted = removePkcs7Padding(aesEcbDecrypt(metaEncrypted, META_KEY))
    // Remove "music:" prefix (6 bytes)
    const metaJson = metaDecrypted.subarray(6).toString('utf-8')
    try {
      meta = JSON.parse(metaJson) as NcmMeta
    } catch {
      meta = { format: 'mp3' }
    }
  } else {
    offset += metaLen
  }

  // 4. Skip CRC32 (4 bytes) + gap (5 bytes) + album image
  offset += 4 // CRC
  offset += 5 // gap
  const imageSize = fileBuffer.readUInt32LE(offset)
  offset += 4
  offset += imageSize

  // 5. Decrypt audio stream with RC4-variant cipher
  const keyBox = buildKeyBox(contentKey)
  const audioEncrypted = fileBuffer.subarray(offset)
  const audioData = Buffer.alloc(audioEncrypted.length)

  for (let i = 0; i < audioEncrypted.length; i++) {
    const idx = (i + 1) & 0xff
    const c = (keyBox[idx] + keyBox[(keyBox[idx] + idx) & 0xff]) & 0xff
    audioData[i] = audioEncrypted[i] ^ keyBox[c]
  }

  return {
    audioData,
    format: meta.format || 'mp3',
    meta
  }
}
