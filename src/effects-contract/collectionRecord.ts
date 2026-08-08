import { COLLECTION_NSID, MAX_COLLECTION_EFFECTS, MAX_NAME_LENGTH } from './constants'

/**
 * The collection grammar — a curated, ordered list of effect URIs. Parse is
 * the read direction (a raw record is untrusted until it passes); build is
 * the write direction, pure, with `createdAt` injected so re-publishing an
 * unchanged collection can preserve the original stamp.
 */

export interface CollectionDef {
  name: string
  description?: string
  /** Ordered effect AT-URIs — the curator's order, preserved by clients. */
  effectUris: string[]
}

export interface CollectionRecordWire {
  $type: 'com.luminframe.collection'
  name: string
  description?: string
  effects: string[]
  createdAt: string
}

export type ParsedCollection = { ok: true; def: CollectionDef } | { ok: false; errors: string[] }

export function parseCollectionRecord(value: unknown): ParsedCollection {
  if (typeof value !== 'object' || value === null) {
    return { ok: false, errors: ['record is not an object'] }
  }
  const record = value as Record<string, unknown>
  const errors: string[] = []

  const name = record.name
  if (typeof name !== 'string' || name.length === 0 || name.length > MAX_NAME_LENGTH) {
    errors.push(`name must be a string of 1–${MAX_NAME_LENGTH} characters`)
  }
  const description = record.description
  if (description !== undefined && typeof description !== 'string') {
    errors.push('description must be a string when present')
  }

  const effects = record.effects
  if (!Array.isArray(effects)) {
    errors.push('effects must be an array')
  } else {
    if (effects.length > MAX_COLLECTION_EFFECTS) {
      errors.push(`effects lists ${effects.length} entries; the maximum is ${MAX_COLLECTION_EFFECTS}`)
    }
    for (const entry of effects) {
      if (typeof entry !== 'string' || !entry.startsWith('at://')) {
        errors.push(`effects entries must be at:// URIs (got ${JSON.stringify(entry)})`)
        break
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors }
  return {
    ok: true,
    def: {
      name: name as string,
      ...(typeof description === 'string' ? { description } : {}),
      effectUris: effects as string[],
    },
  }
}

export function buildCollectionRecord(def: CollectionDef, createdAt: string): CollectionRecordWire {
  return {
    $type: COLLECTION_NSID,
    name: def.name,
    ...(def.description ? { description: def.description } : {}),
    effects: def.effectUris,
    createdAt,
  }
}
