import { ShaderEffect, ShaderInputVars } from '@/types/shader'

/**
 * Whether one pass animates — the single truth consulted by the render loop,
 * the download exporter, and the save path, so they can never disagree.
 *
 * A pass animates when its shader body advances on `time` or feeds back on
 * `prevFrame`. One refinement: an effect may declare `animatedBy`, naming the
 * parameter that gates its motion — its body mentions `time`, but with that
 * parameter at zero every frame is identical (e.g. Light Leak's `drift`).
 * Then the parameter's value decides, so a still-by-default effect exports as
 * the still it visibly is instead of a video of frozen frames.
 */
export function passIsAnimated(
  effect: Pick<ShaderEffect, 'getBody' | 'animatedBy' | 'defaultValues'>,
  params: ShaderInputVars
): boolean {
  const body = effect.getBody()
  // Feedback is checked before the gate on purpose: a feedback effect
  // accumulates state across frames no matter what its parameters read, so
  // animatedBy can never quiet it — only time-driven motion is gateable.
  if (/\bprevFrame\b/.test(body)) return true
  if (!/\btime\b/.test(body)) return false
  if (!effect.animatedBy) return true
  const gate = params[effect.animatedBy] ?? effect.defaultValues[effect.animatedBy]
  return typeof gate === 'number' && gate !== 0
}

/**
 * An effect's motion character, as a user should expect it before touching a
 * slider: 'animated' moves out of the box, 'gated' is still until its
 * animatedBy parameter is raised (e.g. Light Leak's drift), 'still' never
 * moves. Derived from the same predicate the render loop and the exporters
 * consult — with no parameters, passIsAnimated reads the defaults — so a
 * motion badge in the library can never disagree with what a download does.
 */
export type EffectMotion = 'animated' | 'gated' | 'still'

export function motionOf(
  effect: Pick<ShaderEffect, 'getBody' | 'animatedBy' | 'defaultValues'>
): EffectMotion {
  if (passIsAnimated(effect, {})) return 'animated'
  if (effect.animatedBy && /\btime\b/.test(effect.getBody())) return 'gated'
  return 'still'
}

/** Whether any pass in a chain animates — the chain moves if any layer does. */
export function chainIsAnimated(
  passes: ReadonlyArray<{
    effect: Pick<ShaderEffect, 'getBody' | 'animatedBy' | 'defaultValues'>
    params: ShaderInputVars
  }>
): boolean {
  return passes.some((p) => passIsAnimated(p.effect, p.params))
}
