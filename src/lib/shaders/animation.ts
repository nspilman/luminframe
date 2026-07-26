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
  if (/\bprevFrame\b/.test(body)) return true
  if (!/\btime\b/.test(body)) return false
  if (!effect.animatedBy) return true
  const gate = params[effect.animatedBy] ?? effect.defaultValues[effect.animatedBy]
  return typeof gate === 'number' && gate !== 0
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
