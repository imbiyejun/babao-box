export type AudioExportFormatId = 'mp3' | 'wav'

export type WavBitDepth = 16 | 24 | 32

export type Mp3Bitrate = 64 | 128 | 192 | 256 | 320

export interface AudioExportQuality {
  mp3Bitrate: Mp3Bitrate
  wavBitDepth: WavBitDepth
}
