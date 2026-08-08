/**
 * The record key an official effect lives under: its camelCase registry key
 * in kebab-case (blackAndWhite → black-and-white), satisfying
 * EFFECT_SLUG_PATTERN. The effects themselves live in canon
 * (com.luminframe.effect records in luminframe.com's repo); this mapping is
 * how their slugs fold back onto the short keys that published recipes name
 * their steps with (see useOfficialEffects).
 */
export function slugForEffectKey(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}
