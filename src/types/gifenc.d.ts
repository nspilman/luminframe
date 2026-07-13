// Minimal type declarations for gifenc (shipped without types). Covers only the
// surface encodeGif.ts uses: a streaming encoder plus the quantize/applyPalette
// pair that turns an RGBA frame into a palette + indices.
declare module 'gifenc' {
  interface GifEncoderInstance {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: { palette?: number[][]; delay?: number }
    ): void
    finish(): void
    bytes(): Uint8Array
  }

  export function GIFEncoder(): GifEncoderInstance
  export function quantize(rgba: Uint8ClampedArray | Uint8Array, maxColors: number): number[][]
  export function applyPalette(rgba: Uint8ClampedArray | Uint8Array, palette: number[][]): Uint8Array
}
