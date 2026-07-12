import { ShaderType } from '@/types/shader'
import { EffectFamily, effectFamilies, blurbOf } from './catalog'
import { shaderLibrary } from './index'

/**
 * Type-to-filter for the effect picker. With 38 effects across 10 families,
 * scanning is a Hick's-Law tax; a search line lets someone who knows what they
 * want skip straight to it. Matching is done here, apart from the component, so
 * the rule is one testable thing.
 *
 * The rule is subsequence matching (command-palette style): the query characters
 * must appear in order within the text, but not necessarily adjacent — so "kld"
 * finds "Kaleidoscope" and a half-typed query still hits. It's forgiving by
 * design; on a curated set of 38 the looseness helps more than it hurts.
 */

/** True when every character of `query` appears in `text`, in order, ignoring case. */
export function subsequenceMatch(query: string, text: string): boolean {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}

/**
 * An effect matches when the query is a subsequence of its display name or its
 * plain-speech blurb — so "grayscale" finds Black & White by what it *does*, not
 * only by what it's called. An empty query matches everything.
 */
export function effectMatchesQuery(shader: ShaderType, query: string): boolean {
  const q = query.trim()
  if (q === '') return true
  return subsequenceMatch(q, shaderLibrary[shader].name) || subsequenceMatch(q, blurbOf(shader))
}

/**
 * The families to show for a query: each family narrowed to its matching
 * effects, families with no match dropped, catalog order preserved. An empty
 * query returns the full catalog unchanged — search overlays browse, never
 * replaces it.
 */
export function filterEffectFamilies(query: string): EffectFamily[] {
  if (query.trim() === '') return effectFamilies
  return effectFamilies
    .map((family) => ({ ...family, effects: family.effects.filter((s) => effectMatchesQuery(s, query)) }))
    .filter((family) => family.effects.length > 0)
}
