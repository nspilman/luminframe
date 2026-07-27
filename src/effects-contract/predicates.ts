/** Shared shape predicates for the record parsers. Internal to the module. */

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

export const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
