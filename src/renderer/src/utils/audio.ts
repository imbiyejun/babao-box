import type { WavBitDepth } from '@/types/audio-export'

/**
 * Trim an AudioBuffer to the specified time range.
 * Returns a new AudioBuffer containing only the selected portion.
 */
export function trimAudioBuffer(
  buffer: AudioBuffer,
  startTime: number,
  endTime: number
): AudioBuffer {
  const { sampleRate, numberOfChannels } = buffer
  const startSample = Math.floor(startTime * sampleRate)
  const endSample = Math.min(Math.ceil(endTime * sampleRate), buffer.length)
  const frameCount = endSample - startSample

  if (frameCount <= 0) {
    throw new Error('Invalid trim range: selection is empty')
  }

  const ctx = new OfflineAudioContext(numberOfChannels, frameCount, sampleRate)
  const trimmed = ctx.createBuffer(numberOfChannels, frameCount, sampleRate)

  for (let ch = 0; ch < numberOfChannels; ch++) {
    trimmed.getChannelData(ch).set(buffer.getChannelData(ch).subarray(startSample, endSample))
  }

  return trimmed
}

// WAV format tags: 1 = PCM integer, 3 = IEEE float
const WAV_FORMAT_PCM = 1
const WAV_FORMAT_FLOAT = 3

/**
 * Encode an AudioBuffer to WAV format.
 * Supports 16-bit PCM, 24-bit PCM, and 32-bit IEEE float.
 */
export function audioBufferToWav(buffer: AudioBuffer, bitDepth: WavBitDepth = 16): ArrayBuffer {
  const { numberOfChannels, sampleRate, length } = buffer
  const bitsPerSample = bitDepth
  const bytesPerSample = bitsPerSample / 8
  const blockAlign = numberOfChannels * bytesPerSample
  const dataLength = length * blockAlign
  const headerLength = 44
  const totalLength = headerLength + dataLength
  const formatTag = bitDepth === 32 ? WAV_FORMAT_FLOAT : WAV_FORMAT_PCM

  const arrayBuffer = new ArrayBuffer(totalLength)
  const view = new DataView(arrayBuffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, totalLength - 8, true)
  writeString(view, 8, 'WAVE')

  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, formatTag, true)
  view.setUint16(22, numberOfChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)

  writeString(view, 36, 'data')
  view.setUint32(40, dataLength, true)

  const channels: Float32Array[] = []
  for (let ch = 0; ch < numberOfChannels; ch++) {
    channels.push(buffer.getChannelData(ch))
  }

  let offset = headerLength
  const writeSample = getWavSampleWriter(bitDepth)
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numberOfChannels; ch++) {
      writeSample(view, offset, channels[ch][i])
      offset += bytesPerSample
    }
  }

  return arrayBuffer
}

type SampleWriter = (view: DataView, offset: number, sample: number) => void

function getWavSampleWriter(bitDepth: WavBitDepth): SampleWriter {
  switch (bitDepth) {
    case 16:
      return (view, offset, sample) => {
        const s = Math.max(-1, Math.min(1, sample))
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      }
    case 24:
      return (view, offset, sample) => {
        const s = Math.max(-1, Math.min(1, sample))
        const val = s < 0 ? Math.round(s * 0x800000) : Math.round(s * 0x7fffff)
        view.setUint8(offset, val & 0xff)
        view.setUint8(offset + 1, (val >> 8) & 0xff)
        view.setUint8(offset + 2, (val >> 16) & 0xff)
      }
    case 32:
      return (view, offset, sample) => {
        view.setFloat32(offset, sample, true)
      }
  }
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${secs.toFixed(2).padStart(5, '0')}`
}
