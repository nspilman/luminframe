export interface CanvasUpload {
  bytes: Uint8Array
  mimeType: string
  /** The rendered pixel dimensions, for the post's aspect-ratio hint. */
  aspectRatio: { width: number; height: number }
}

// Bluesky's image embed currently allows up to 2 MB, but older PDS deployments
// capped at 1 MB. Targeting just under 1 MB keeps a uploadable everywhere with
// headroom for the multipart overhead.
const DEFAULT_MAX_BYTES = 1_000_000

// Quality ladder tried in order. JPEG re-encoding also drops any EXIF/GPS the
// source carried, so we don't leak camera metadata when publishing.
const QUALITY_STEPS = [0.92, 0.85, 0.75, 0.6, 0.45]

// If even the lowest quality is too big, the image is simply too large in pixels
// — cap the longest side and re-encode.
const MAX_LONGEST_SIDE = 2048

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas encoding produced no data'))),
      'image/jpeg',
      quality
    )
  })
}

/** Uniformly scaled dimensions whose longest side is at most `maxLongest`. */
export function scaleToLongestSide(
  width: number,
  height: number,
  maxLongest: number
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxLongest) return { width, height }
  const ratio = maxLongest / longest
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  }
}

/**
 * Encode the rendered canvas as JPEG bytes small enough to upload. Steps down
 * the quality ladder first; only if that's not enough does it downscale the
 * pixels and try again. The reported `aspectRatio` is always the original
 * render's ratio (uniform scaling preserves it).
 */
export async function exportCanvasForUpload(
  canvas: HTMLCanvasElement,
  maxBytes: number = DEFAULT_MAX_BYTES
): Promise<CanvasUpload> {
  const aspectRatio = { width: canvas.width, height: canvas.height }

  for (const quality of QUALITY_STEPS) {
    const blob = await canvasToBlob(canvas, quality)
    if (blob.size <= maxBytes) {
      return {
        bytes: new Uint8Array(await blob.arrayBuffer()),
        mimeType: 'image/jpeg',
        aspectRatio,
      }
    }
  }

  // Downscale onto an offscreen canvas, then walk the quality ladder once more.
  const scaled = scaleToLongestSide(canvas.width, canvas.height, MAX_LONGEST_SIDE)
  const offscreen = document.createElement('canvas')
  offscreen.width = scaled.width
  offscreen.height = scaled.height
  const ctx = offscreen.getContext('2d')
  if (!ctx) throw new Error('Could not get a 2D context to downscale the image')
  ctx.drawImage(canvas, 0, 0, scaled.width, scaled.height)

  for (const quality of QUALITY_STEPS) {
    const blob = await canvasToBlob(offscreen, quality)
    if (blob.size <= maxBytes) {
      return {
        bytes: new Uint8Array(await blob.arrayBuffer()),
        mimeType: 'image/jpeg',
        aspectRatio,
      }
    }
  }

  throw new Error('Could not compress the image under the upload size limit')
}
