import { Dimensions } from '@/domain/value-objects/Dimensions'
import { Image } from '@/domain/models/Image'
import { ThreeJSRenderingAdapter } from '@/infrastructure/adapters/ThreeJSRenderingAdapter'
import { InMemoryShaderRepositoryAdapter } from '@/infrastructure/adapters/InMemoryShaderRepositoryAdapter'
import { ApplyShaderEffectUseCase } from '@/application/usecases/ApplyShaderEffectUseCase'
import { registeredShaders, ShaderType } from '@/types/shader'
import { shaderLibrary } from '@/lib/shaders'

// The longest edge of a generated thumbnail, in device pixels. Small enough
// that sixteen GPU passes are cheap and one-time per source.
const MAX_EDGE = 96

// Best-effort cap on waiting for the source texture. The source is an image the
// editor already rendered, so load is near-certain; this only guards against a
// texture that errors and never fires its load callback, so we return whatever
// rendered rather than hanging the picker forever.
const PRIME_TIMEOUT_MS = 4000

/**
 * Fit a source's dimensions into a square thumbnail box, preserving aspect.
 * The longest edge becomes maxEdge; the short edge scales to match and never
 * rounds below 1 (an extreme aspect ratio must still be a valid Dimensions).
 */
export function thumbnailDimensions(source: Dimensions, maxEdge: number): Dimensions {
  const factor = maxEdge / Math.max(source.width, source.height)
  const width = Math.max(1, Math.round(source.width * factor))
  const height = Math.max(1, Math.round(source.height * factor))
  return new Dimensions(width, height)
}

/**
 * Render every registered effect against the source at its default parameters,
 * returning a data-URL thumbnail per effect.
 *
 * Runs on a short-lived, offscreen renderer so the live canvas never flickers.
 * The renderer is torn down before returning. Effects that read a second image
 * (blend, lightThresholdSwap) have no second input at defaults — their
 * thumbnails reflect that, and the picker falls back to an icon for them.
 */
export async function renderEffectThumbnails(
  source: Image
): Promise<Record<ShaderType, string>> {
  const dims = thumbnailDimensions(source.getDimensions(), MAX_EDGE)
  const canvas = document.createElement('canvas')
  canvas.width = dims.width
  canvas.height = dims.height

  const adapter = new ThreeJSRenderingAdapter(canvas, dims)
  const apply = new ApplyShaderEffectUseCase(adapter, new InMemoryShaderRepositoryAdapter())

  // Tearing down the offscreen adapter clears its texture cache, which disposes
  // every cached Image — including the source. A blob-less clone makes that
  // dispose a no-op, so we never revoke the live editor's source URL.
  const safeSource = new Image(source.id, source.getDimensions(), { url: source.data.url })
  const resolution = dims.toArray()

  const renderPass = (type: ShaderType) =>
    apply.execute(safeSource, type, {
      ...shaderLibrary[type].defaultValues,
      imageTexture: safeSource,
      resolution,
    })

  try {
    await primeTexture(adapter, () => renderPass(registeredShaders[0]))

    const thumbnails = {} as Record<ShaderType, string>
    for (const type of registeredShaders) {
      renderPass(type)
      thumbnails[type] = canvas.toDataURL('image/png')
    }
    return thumbnails
  } finally {
    adapter.dispose()
  }
}

/**
 * Kick a first render to trigger the source texture's async load, resolving
 * once it's ready (or after a timeout). Reading the canvas before this would
 * capture blank frames, since the texture hasn't been uploaded to the GPU yet.
 */
function primeTexture(
  adapter: ThreeJSRenderingAdapter,
  firstRender: () => void
): Promise<void> {
  return new Promise((resolve) => {
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      resolve()
    }
    adapter.setTextureLoadCallback(done)
    firstRender()
    setTimeout(done, PRIME_TIMEOUT_MS)
  })
}
