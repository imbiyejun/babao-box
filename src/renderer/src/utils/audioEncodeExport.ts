import type { AudioExportFormatId, AudioExportQuality } from '@/types/audio-export'
import { audioBufferToWav } from '@/utils/audio'
import { audioBufferToMp3 } from '@/utils/audioMp3'

export function encodeAudioBufferForExport(
  buffer: AudioBuffer,
  format: AudioExportFormatId,
  quality: AudioExportQuality
): ArrayBuffer {
  if (format === 'wav') {
    return audioBufferToWav(buffer, quality.wavBitDepth)
  }
  return audioBufferToMp3(buffer, quality.mp3Bitrate)
}
