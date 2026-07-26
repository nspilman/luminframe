import { ShaderEffect } from '@/types/shader'
import { shaderBuilder } from '@/shaders/shaderBuilder'

/**
 * The compile gate for runtime-loaded effects: the grammar (effects-contract)
 * proves a record is well-formed, but only the GPU's compiler can prove the
 * GLSL itself is. This builds the exact fragment source the renderer would
 * (same shaderBuilder, same declarations) and compiles it in a throwaway
 * WebGL context, so a broken shader becomes an excluded effect with an error
 * log instead of a black canvas.
 *
 * 'unavailable' means no WebGL context could be created (jsdom, headless CI) —
 * callers treat it as a pass, with the render path's console error as the
 * runtime backstop.
 */
export type CompileCheck =
  | { status: 'ok' }
  | { status: 'failed'; log: string }
  | { status: 'unavailable' }

export function checkEffectCompiles(effect: ShaderEffect): CompileCheck {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl')
  if (!gl) return { status: 'unavailable' }

  // Three injects a precision qualifier when it assembles a material; a raw
  // context needs it stated explicitly for the source to be equivalent.
  const source =
    'precision mediump float;\n' +
    shaderBuilder({ vars: effect.declarationVars, getBody: effect.getBody })

  const shader = gl.createShader(gl.FRAGMENT_SHADER)
  if (!shader) return { status: 'unavailable' }
  try {
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      return { status: 'ok' }
    }
    return { status: 'failed', log: gl.getShaderInfoLog(shader) ?? 'unknown compile error' }
  } finally {
    gl.deleteShader(shader)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}
