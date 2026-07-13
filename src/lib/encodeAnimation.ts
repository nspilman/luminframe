import { encodeGif } from './encodeGif'
import { encodeMp4, isMp4EncodingSupported } from './encodeMp4'

/** Encoded animation bytes plus how to label the download (mime + extension). */
export interface AnimationEncoding {
  bytes: Uint8Array
  mimeType: string
  extension: string
}

/**
 * The single seam between captured frames and a downloadable animation. Prefers
 * MP4 (H.264) — standard, well-compressed, full-colour, and playable everywhere
 * including Bluesky's video embed — and falls back to an animated GIF only where
 * the browser lacks WebCodecs or fails to encode, so the download never dead-ends.
 *
 * Callers stay format-agnostic: they hand over frames and get back bytes with the
 * mime type and extension to name them.
 */
export async function encodeAnimation(
  frames: ImageData[],
  fps: number
): Promise<AnimationEncoding> {
  if (isMp4EncodingSupported()) {
    try {
      const bytes = await encodeMp4(frames, fps)
      return { bytes, mimeType: 'video/mp4', extension: 'mp4' }
    } catch (error) {
      // A browser that advertised WebCodecs but still failed to encode: fall back
      // to GIF rather than fail the download, and name the reason for the next
      // debugger rather than swallowing it silently.
      console.warn('MP4 encode failed; falling back to GIF', error)
    }
  }
  return { bytes: encodeGif(frames, fps), mimeType: 'image/gif', extension: 'gif' }
}
