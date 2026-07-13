import { GIFEncoder, quantize, applyPalette } from 'gifenc'

/**
 * A GIF frame's on-screen duration, in centiseconds — GIF's unit (1/100 s), not
 * milliseconds. Clamped to a 2cs floor because many viewers treat 0–1cs delays as
 * "as fast as possible" and play them inconsistently, so a nominal 100fps would
 * animate at wildly different speeds across players.
 */
export function frameDelayCentiseconds(fps: number): number {
  return Math.max(2, Math.round(100 / fps))
}

/**
 * Encode a sequence of RGBA frames into an animated, looping GIF. Each frame gets
 * its own 256-colour palette (local palette) — larger than a shared global palette,
 * but it keeps the shader's gradients from banding worse than GIF already forces.
 * Synchronous and CPU-bound (quantization per frame); callers show progress and
 * yield to the event loop before calling it.
 */
export function encodeGif(frames: ImageData[], fps: number): Uint8Array {
  const gif = GIFEncoder()
  const delay = frameDelayCentiseconds(fps)
  for (const frame of frames) {
    const rgba = frame.data
    const palette = quantize(rgba, 256)
    const index = applyPalette(rgba, palette)
    gif.writeFrame(index, frame.width, frame.height, { palette, delay })
  }
  gif.finish()
  return gif.bytes()
}
