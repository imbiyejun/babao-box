declare module 'lamejs' {
  interface Mp3EncoderInstance {
    encodeBuffer(left: Int16Array, right: Int16Array): Int8Array
    flush(): Int8Array
  }

  interface LameJs {
    Mp3Encoder: new (channels: number, samplerate: number, kbps: number) => Mp3EncoderInstance
  }

  const lamejs: LameJs
  export default lamejs
}

/** CJS subpath used only to polyfill Lame.js implicit global `MPEGMode`. */
declare module 'lamejs/src/js/MPEGMode.js' {
  interface MPEGModeValue {
    ordinal(): number
  }

  interface MPEGModeModule {
    new (ordinal: number): MPEGModeValue
    STEREO: MPEGModeValue
    JOINT_STEREO: MPEGModeValue
    DUAL_CHANNEL: MPEGModeValue
    MONO: MPEGModeValue
    NOT_SET: MPEGModeValue
  }

  const MPEGMode: MPEGModeModule
  export default MPEGMode
}
