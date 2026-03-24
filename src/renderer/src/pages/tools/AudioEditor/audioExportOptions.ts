import type {
  AudioExportFormatId,
  AudioExportQuality,
  Mp3Bitrate,
  WavBitDepth
} from '@/types/audio-export'

export const DEFAULT_EXPORT_FORMAT: AudioExportFormatId = 'mp3'

export const DEFAULT_EXPORT_QUALITY: AudioExportQuality = {
  mp3Bitrate: 192,
  wavBitDepth: 16
}

export const EXPORT_FORMAT_SELECT_OPTIONS: { label: string; value: AudioExportFormatId }[] = [
  { label: 'MP3', value: 'mp3' },
  { label: 'WAV', value: 'wav' }
]

export const MP3_BITRATE_OPTIONS: { label: string; value: Mp3Bitrate }[] = [
  { label: '64 kbps · 较低', value: 64 },
  { label: '128 kbps · 标准', value: 128 },
  { label: '192 kbps · 高品质', value: 192 },
  { label: '256 kbps · 极高', value: 256 },
  { label: '320 kbps · 最高', value: 320 }
]

export const WAV_BIT_DEPTH_OPTIONS: { label: string; value: WavBitDepth }[] = [
  { label: '16-bit (标准)', value: 16 },
  { label: '24-bit (高品质)', value: 24 },
  { label: '32-bit float (专业级)', value: 32 }
]

export function defaultTrimmedSaveName(stem: string, format: AudioExportFormatId): string {
  return `${stem}_trimmed.${format}`
}

export function exportSaveDialogFilters(): Electron.FileFilter[] {
  return [
    { name: 'MP3 Audio', extensions: ['mp3'] },
    { name: 'WAV Audio', extensions: ['wav'] },
    { name: 'All Files', extensions: ['*'] }
  ]
}
