import type { AudioExportFormatId } from '@/types/audio-export'

export const DEFAULT_EXPORT_FORMAT: AudioExportFormatId = 'mp3'

export const EXPORT_FORMAT_SELECT_OPTIONS: { label: string; value: AudioExportFormatId }[] = [
  { label: 'MP3', value: 'mp3' },
  { label: 'WAV', value: 'wav' }
]

export function defaultTrimmedSaveName(stem: string, format: AudioExportFormatId): string {
  return `${stem}_trimmed.${format}`
}

/** Save dialog filters aligned with export formats (Electron main). */
export function exportSaveDialogFilters(): Electron.FileFilter[] {
  return [
    { name: 'MP3 Audio', extensions: ['mp3'] },
    { name: 'WAV Audio', extensions: ['wav'] },
    { name: 'All Files', extensions: ['*'] }
  ]
}
