import type { BlobRef, Facet } from '@atproto/api'

/**
 * Grain (grain.social) record shapes. Unlike Bluesky, these lexicons
 * (`social.grain.*`) are NOT in `@atproto/api`, so the record types are
 * declared here and the builders are validated against the vendored lexicon
 * JSON in the adapter (see grainLexicons.ts).
 *
 * Publishing one image to Grain writes THREE records, because a photo can't
 * stand alone — it must live in a gallery:
 *   1. social.grain.photo        the blob + aspect ratio
 *   2. social.grain.gallery      the gallery that holds it
 *   3. social.grain.gallery.item the join linking photo ⇄ gallery
 *
 * Each builder is pure so the exact record structure — the `$type`
 * discriminators and required fields a typo would silently break — is tested in
 * isolation. All I/O (uploading the blob, stamping the time, minting AT-URIs)
 * lives in the adapter.
 */

export interface GrainPhotoRecord {
  $type: 'social.grain.photo'
  photo: BlobRef
  aspectRatio: { width: number; height: number }
  createdAt: string
  alt?: string
}

export interface GrainGalleryRecord {
  $type: 'social.grain.gallery'
  title: string
  createdAt: string
  description?: string
  facets?: Facet[]
}

export interface GrainGalleryItemRecord {
  $type: 'social.grain.gallery.item'
  gallery: string
  item: string
  createdAt: string
  position?: number
}

export interface GrainPhotoParts {
  /** The uploaded image blob reference returned by `uploadBlob`. */
  blob: BlobRef
  aspectRatio: { width: number; height: number }
  /** Accessibility description. Optional on Grain (required on Bluesky). */
  alt?: string
  /** ISO timestamp; passed in rather than read from the clock so this stays pure. */
  createdAt: string
}

export interface GrainGalleryParts {
  /** Gallery title. Required by the lexicon; Grain caps it at 100 chars. */
  title: string
  /** Optional gallery description (carries the attribution backlink). */
  description?: string
  /** Facets annotating the description (links, mentions, tags). */
  facets?: Facet[]
  createdAt: string
}

export interface GrainItemParts {
  /** AT-URI of the gallery record. */
  gallery: string
  /** AT-URI of the photo record. */
  item: string
  createdAt: string
}

/** The lexicon caps `social.grain.gallery` titles at 100 characters. */
export const GRAIN_GALLERY_TITLE_MAX = 100

/** Title shown when an image is published with no caption to draw from. */
export const GRAIN_DEFAULT_GALLERY_TITLE = 'Luminframe'

/**
 * Derive a gallery title from the user's caption, guaranteed to satisfy the
 * lexicon's 100-char cap so the write can never be rejected for length.
 *
 * A gallery title is a short label, not the body — so it takes only the first
 * line of the caption (the full caption lives in the description). An empty
 * caption falls back to the app name. Over-long titles are cut at the cap with
 * an ellipsis rather than hard-truncated mid-word-cliff, so the budget is the
 * ellipsis included (99 chars + '…' = 100).
 */
export function deriveGalleryTitle(caption: string): string {
  const firstLine = caption.split('\n')[0].trim()
  if (firstLine.length === 0) return GRAIN_DEFAULT_GALLERY_TITLE
  if (firstLine.length <= GRAIN_GALLERY_TITLE_MAX) return firstLine
  return firstLine.slice(0, GRAIN_GALLERY_TITLE_MAX - 1) + '…'
}

export function buildGrainPhotoRecord(parts: GrainPhotoParts): GrainPhotoRecord {
  const { blob, aspectRatio, alt, createdAt } = parts

  const record: GrainPhotoRecord = {
    $type: 'social.grain.photo',
    photo: blob,
    aspectRatio: { width: aspectRatio.width, height: aspectRatio.height },
    createdAt,
  }

  // alt is optional on Grain — only attach it when there's something to say,
  // rather than writing an empty string into the repo.
  if (alt && alt.trim().length > 0) {
    record.alt = alt
  }

  return record
}

export function buildGrainGalleryRecord(parts: GrainGalleryParts): GrainGalleryRecord {
  const { title, description, facets, createdAt } = parts

  const record: GrainGalleryRecord = {
    $type: 'social.grain.gallery',
    title,
    createdAt,
  }

  if (description && description.length > 0) {
    record.description = description
  }

  // Only attach facets when there are some — an empty array is noise in the repo,
  // and facets without description text to annotate are meaningless.
  if (facets && facets.length > 0) {
    record.facets = facets
  }

  return record
}

export function buildGrainItemRecord(parts: GrainItemParts): GrainGalleryItemRecord {
  const { gallery, item, createdAt } = parts

  // `position` defaults to 0 in the lexicon, and a single-photo gallery has only
  // one item — so we omit it and let the default stand rather than hard-coding 0.
  return {
    $type: 'social.grain.gallery.item',
    gallery,
    item,
    createdAt,
  }
}
