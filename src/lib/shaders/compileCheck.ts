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

// One context for every check, created lazily and kept. A context per call
// looked tidy — each was lose-context'd in a finally — but iOS WebKit caps
// LIVE WebGL contexts at around a dozen and evicts the oldest when the cap
// hits: gating a 39-effect library at startup executed the editor's own
// renderer ("[gl] CONTEXT LOST" at 0.9s on an iPhone, canvas black for the
// life of the page). Compiling every shader in one shared context costs the
// cap exactly one slot, once.
let sharedGl: WebGL2RenderingContext | null = null

function compileContext(): WebGL2RenderingContext | null {
  if (sharedGl && !sharedGl.isContextLost()) return sharedGl
  // webgl2, because that is the context the app renders on (three r163+
  // dropped WebGL1). A WebGL1 gate is stricter than the runtime — it rejects
  // uniform-bounded loops the renderer compiles fine — so it lied both ways.
  sharedGl = document.createElement('canvas').getContext('webgl2')
  return sharedGl
}

export function checkEffectCompiles(effect: ShaderEffect): CompileCheck {
  const gl = compileContext()
  if (!gl) return { status: 'unavailable' }

  // The same GLSL1 → GLSL3 shim three's WebGLProgram applies when it
  // assembles a material on WebGL2 (plus the precision qualifier it injects).
  // Without it the driver compiles under ES 1.00 rules — a stricter grammar
  // than anything the renderer will ever feed it.
  const source =
    '#version 300 es\n' +
    'precision mediump float;\n' +
    '#define varying in\n' +
    '#define texture2D texture\n' +
    'layout(location = 0) out highp vec4 pc_fragColor;\n' +
    '#define gl_FragColor pc_fragColor\n' +
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
  }
}
