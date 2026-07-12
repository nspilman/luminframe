import type { BlobRef } from '@atproto/api'

/**
 * Luminframe's own lexicon: `com.luminframe.image`. The authority segment
 * (`com.luminframe`) is the reverse-DNS of luminframe.com, the domain the app
 * owns — the NSID convention requires the authority be a domain you control.
 *
 * Unlike the Bluesky and Grain adapters, this is *our* record type, so one save
 * writes a single first-class record to the user's repo carrying:
 *   - the rendered image, as an uploaded blob
 *   - its pixel aspect ratio (so a viewer can lay it out without decoding)
 *   - the edit recipe: the effect keys applied, in order — what makes this a
 *     Luminframe record and not just a photo in a custom namespace
 *
 * The schema is published (see lexicons/com/luminframe/image.json and
 * scripts/publish-lexicon.mjs), so the PDS validates these records server-side.
 * The builder stays pure regardless, so the `$type` discriminator and field
 * shape a typo would break are also pinned client-side (luminframeRecords.test.ts).
 * All I/O — uploading the blob, stamping the time, minting the AT-URI — lives in
 * the adapter.
 */

export const LUMINFRAME_IMAGE_COLLECTION = 'com.luminframe.image'

export interface LuminframeImageRecord {
  $type: 'com.luminframe.image'
  /** The rendered image blob, from `uploadBlob`. */
  image: BlobRef
  /** Pixel dimensions of the render, for aspect-ratio layout. */
  aspectRatio: { width: number; height: number }
  /** ISO timestamp. */
  createdAt: string
  /** Accessibility description. */
  alt?: string
  /** Short caption / label. */
  title?: string
  /** The effect keys applied to produce this image, in order (the edit recipe). */
  effects?: string[]
}

export interface LuminframeImageParts {
  /** The uploaded image blob reference returned by `uploadBlob`. */
  blob: BlobRef
  aspectRatio: { width: number; height: number }
  /** ISO timestamp; passed in rather than read from the clock so this stays pure. */
  createdAt: string
  alt?: string
  title?: string
  effects?: readonly string[]
}

export function buildLuminframeImageRecord(parts: LuminframeImageParts): LuminframeImageRecord {
  const { blob, aspectRatio, createdAt, alt, title, effects } = parts

  const record: LuminframeImageRecord = {
    $type: 'com.luminframe.image',
    image: blob,
    aspectRatio: { width: aspectRatio.width, height: aspectRatio.height },
    createdAt,
  }

  // Optional fields are attached only when they carry something, so the repo
  // never stores an empty string or an empty array as if it were meaningful.
  if (alt && alt.trim().length > 0) {
    record.alt = alt.trim()
  }
  if (title && title.trim().length > 0) {
    record.title = title.trim()
  }
  if (effects && effects.length > 0) {
    record.effects = [...effects]
  }

  return record
}
