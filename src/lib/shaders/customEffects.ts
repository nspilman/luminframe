import { EffectDefinition, EffectParamDef } from '@/effects-contract'
import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig'
import { ShaderEffect } from '@/types/shader'

/**
 * Hydrate a validated effect definition (a com.luminframe.effect record after
 * parseEffectRecord) into a live ShaderEffect — through the exact factory the
 * builtins use, so opacity/resolution injection, body wrapping, and the
 * animation predicates apply to a custom effect the same way, once.
 *
 * `imageTexture` is host-provided (the env contract forbids declaring it as a
 * param), so the codec prepends it here — the one difference from a builtin's
 * hand-written variable list.
 */

function variableFor(param: EffectParamDef) {
  const v = createShaderVariable(param.name)
  switch (param.type) {
    case 'range':
      return v.asRange(param.label, param.default, param.min, param.max, param.step)
    case 'color':
      return v.asVec3(param.label, param.default[0], param.default[1], param.default[2])
    case 'boolean':
      return v.asBoolean(param.label, param.default)
    case 'vec2':
      return v.asVec2(
        param.label,
        param.default[0],
        param.default[1],
        param.min && param.max && param.step
          ? { min: param.min, max: param.max, step: param.step, ...(param.labels ? { labels: param.labels } : {}) }
          : undefined
      )
    case 'image':
      return v.asImage(param.label)
    case 'text':
      return v.asText(param.label, param.default, param.placeholder)
  }
}

export function hydrateEffectDefinition(def: EffectDefinition): ShaderEffect {
  return createShaderRecord({
    name: def.name,
    variables: [
      createShaderVariable('imageTexture').asImage('Source Image'),
      ...def.params.map(variableFor),
    ],
    body: def.body,
    ...(def.animatedBy ? { animatedBy: def.animatedBy } : {}),
  })
}
