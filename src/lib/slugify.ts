import { EFFECT_SLUG_PATTERN } from '@/effects-contract'

/**
 * A display name → a record slug (the rkey shape EFFECT_SLUG_PATTERN
 * demands): lowercased, runs of anything else collapsed to single hyphens,
 * edges trimmed. Empty when the name has no usable characters at all.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function isValidSlug(slug: string): boolean {
  return EFFECT_SLUG_PATTERN.test(slug)
}
