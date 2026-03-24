import type { AudioExportFormatId } from '@/types/audio-export'
import { audioBufferToWav } from '@/utils/audio'
import { audioBufferToMp3 } from '@/utils/audioMp3'

/** Encode trimmed buffer for the chosen export format. */
export function encodeAudioBufferForExport(
  buffer: AudioBuffer,
  format: AudioExportFormatId
): ArrayBuffer {
  if (format === 'wav') {
    return audioBufferToWav(buffer)
  }
  return audioBufferToMp3(buffer)
}
