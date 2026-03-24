import lamejs from '@/utils/lamejsInstallGlobals'

const MP3_FRAME_SAMPLES = 1152
const DEFAULT_KBPS = 128

// MPEG1 (32000-48000 Hz) max 320, MPEG2 (16000-24000 Hz) max 160, MPEG2.5 (<16000 Hz) max 64
function clampBitrate(kbps: number, sampleRate: number): number {
  const rate = Math.round(Number(kbps)) || DEFAULT_KBPS
  if (sampleRate >= 32000) return Math.min(rate, 320)
  if (sampleRate >= 16000) return Math.min(rate, 160)
  return Math.min(rate, 64)
}

function floatToInt16(sample: number): number {
  const s = Math.max(-1, Math.min(1, sample))
  return s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff)
}

/**
 * Encode AudioBuffer to MP3 (Layer III) via lamejs; stereo uses first two channels.
 */
export function audioBufferToMp3(buffer: AudioBuffer, kbps: number = DEFAULT_KBPS): ArrayBuffer {
  const n = buffer.length
  const inChannels = buffer.numberOfChannels
  const outChannels = inChannels >= 2 ? 2 : 1
  const sampleRate = buffer.sampleRate
  const safeBitrate = clampBitrate(kbps, sampleRate)

  const left = new Int16Array(n)
  const ch0 = buffer.getChannelData(0)
  for (let i = 0; i < n; i++) {
    left[i] = floatToInt16(ch0[i])
  }

  let right: Int16Array
  if (outChannels === 2) {
    right = new Int16Array(n)
    const ch1 = buffer.getChannelData(1)
    for (let i = 0; i < n; i++) {
      right[i] = floatToInt16(ch1[i])
    }
  } else {
    right = left
  }

  const encoder = new lamejs.Mp3Encoder(outChannels, sampleRate, safeBitrate)
  const parts: Int8Array[] = []

  for (let i = 0; i < n; i += MP3_FRAME_SAMPLES) {
    const end = Math.min(i + MP3_FRAME_SAMPLES, n)
    const leftChunk = left.subarray(i, end)
    const rightChunk = outChannels === 2 ? right.subarray(i, end) : leftChunk
    const block = encoder.encodeBuffer(leftChunk, rightChunk)
    if (block.length > 0) {
      parts.push(block)
    }
  }

  const tail = encoder.flush()
  if (tail.length > 0) {
    parts.push(tail)
  }

  const total = parts.reduce((sum, p) => sum + p.length, 0)
  const merged = new Uint8Array(total)
  let offset = 0
  for (const p of parts) {
    merged.set(p, offset)
    offset += p.length
  }

  return merged.buffer.slice(merged.byteOffset, merged.byteOffset + merged.byteLength)
}
