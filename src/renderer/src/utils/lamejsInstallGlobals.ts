/**
 * lamejs CJS modules have broken cross-file globals (MPEGMode, Lame, etc.).
 * Use the self-contained `lame.all.js` bundle instead — it wraps everything
 * inside `function lamejs() { ... } lamejs();` so all internal refs resolve.
 *
 * After calling `lamejs()`, `lamejs.Mp3Encoder` is attached to the function object.
 * We eval the whole source then return that function object.
 */

interface LamejsMp3Encoder {
  encodeBuffer(left: Int16Array, right: Int16Array): Int8Array
  flush(): Int8Array
}

export interface LamejsExports {
  Mp3Encoder: new (channels: number, samplerate: number, kbps: number) => LamejsMp3Encoder
}

// @ts-expect-error — untyped raw source import
import lamejsSource from 'lamejs/lame.all.js?raw'

const _lamejs: LamejsExports = new Function(`${lamejsSource}\nreturn lamejs;`)()

export default _lamejs
