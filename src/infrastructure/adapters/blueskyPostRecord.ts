import type { AppBskyFeedPost, BlobRef, Facet } from '@atproto/api'

export interface ImagePostParts {
  /** The uploaded image blob reference returned by `uploadBlob`. */
  blob: BlobRef
  /** Accessibility description, required on Bluesky image embeds. */
  alt: string
  /** The caption text (already normalized by RichText). */
  text: string
  /** Detected rich-text facets (mentions, links, tags), if any. */
  facets?: Facet[]
  aspectRatio: { width: number; height: number }
  /** ISO timestamp; passed in rather than read from the clock so this stays pure. */
  createdAt: string
}

/**
 * Assemble an `app.bsky.feed.post` record carrying a single image embed — the
 * shape Bluesky (and Pinksky/Flashes on top of it) render as a photo post.
 *
 * Pure on purpose: all I/O (uploading the blob, resolving facets, stamping the
 * time) happens in the adapter, so the record's exact structure — the nested
 * `$type` discriminators a typo would silently break — is tested in isolation.
 */
export function buildImagePostRecord(parts: ImagePostParts): AppBskyFeedPost.Record {
  const { blob, alt, text, facets, aspectRatio, createdAt } = parts

  const record: AppBskyFeedPost.Record = {
    $type: 'app.bsky.feed.post',
    text,
    createdAt,
    // Without a language tag the post is excluded from language-filtered feeds.
    langs: ['en'],
    embed: {
      $type: 'app.bsky.embed.images',
      images: [
        {
          image: blob,
          alt,
          aspectRatio: { width: aspectRatio.width, height: aspectRatio.height },
        },
      ],
    },
  }

  // Only attach facets when there are some — an empty array is noise in the repo.
  if (facets && facets.length > 0) {
    record.facets = facets
  }

  return record
}
