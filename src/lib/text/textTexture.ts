/**
 * Turning typed text into something a shader can read.
 *
 * A fragment shader has no notion of a glyph — every uniform it can take is a
 * number, a vector, or a texture. So text becomes a texture: Canvas 2D draws
 * the string (it already knows fonts, kerning, and every script the browser
 * has), and the shader gets pixels.
 *
 * The canvas is square and the glyphs are drawn white on transparent. Square
 * because that lets the whole feature travel on one uniform: a texture with a
 * known aspect of 1 needs no companion uniform telling the shader how wide it
 * really is, and the shader can treat it as a unit tile it places, scales and
 * spins. White-on-transparent because colour belongs to the effect — the alpha
 * channel is the shape of the letters, and the shader tints it. Baking a colour
 * here would mean re-rasterising on every nudge of a colour picker.
 *
 * ponytail: one canvas size for all strings. A long string is fitted to the
 * same square, so it renders smaller and softer than a short one; the Size dial
 * compensates. Per-string canvas dimensions would sharpen that case, at the
 * cost of a second uniform carrying the aspect.
 */

/** Side of the square the text is drawn into, in pixels. */
const CANVAS_SIZE = 1024

/** Fraction of the square the glyphs are fitted within, leaving a margin. */
const FIT = 0.9

/**
 * A system font stack rather than a web font: it needs no network fetch, so the
 * first render of a string is never a frame of missing text, and it can't fail
 * differently in the export than in the preview.
 */
const FONT_STACK =
  '"Helvetica Neue", Helvetica, Arial, "Segoe UI", Roboto, system-ui, sans-serif'

/**
 * Draw `text` into a square canvas, white on transparent, as large as it fits.
 * Multi-line: newlines break, and the block is centred as a whole.
 */
export function renderTextCanvas(text: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_SIZE
  canvas.height = CANVAS_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const lines = text.split('\n')
  const target = CANVAS_SIZE * FIT

  // Measure once at a reference size, then scale by the ratio that makes the
  // block fit — one measure pass instead of searching for a size that fits.
  const REF = 100
  ctx.font = `bold ${REF}px ${FONT_STACK}`
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 1)
  const blockHeight = lines.length * REF * 1.2
  const fontSize = REF * Math.min(target / widest, target / blockHeight)

  ctx.font = `bold ${fontSize}px ${FONT_STACK}`
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const lineHeight = fontSize * 1.2
  const startY = CANVAS_SIZE / 2 - ((lines.length - 1) * lineHeight) / 2
  lines.forEach((line, i) => {
    ctx.fillText(line, CANVAS_SIZE / 2, startY + i * lineHeight)
  })

  return canvas
}
