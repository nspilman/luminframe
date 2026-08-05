import { useCallback, useEffect, useRef, useState } from 'react'
import { Image } from '@/domain/models/Image'
import { Dimensions } from '@/domain/value-objects/Dimensions'
import { EditPipeline } from '@/domain/models/EditPipeline'
import { RenderEditUseCase } from '@/application/usecases/RenderEditUseCase'
import { ThreeJSRenderingAdapter } from '@/infrastructure/adapters/ThreeJSRenderingAdapter'
import { InMemoryShaderRepositoryAdapter } from '@/infrastructure/adapters/InMemoryShaderRepositoryAdapter'
import { ShaderEffect, ShaderInputVars } from '@/types/shader'
import { urlToFile } from '@/lib/urlToFile'
import { SAMPLE_IMAGE_URL } from '@/lib/sampleImage'
import { useImageLoader } from '@/hooks/useImageLoader'

/**
 * The Effect Creator's render surface: its own adapter + repository + use
 * case (the effectThumbnails composition, held for the room's lifetime), so
 * the editor's singleton engine is never touched. The draft effect is
 * registered under one private key and rendered as the lone pass over the
 * test image; animated drafts animate because the adapter runs its own rAF
 * loop whenever the chain calls for one.
 *
 * Lifecycle laws this hook exists to keep:
 * - The adapter is created lazily (first render with a live canvas) and
 *   disposed on unmount — StrictMode's mount/unmount/mount costs at most one
 *   throwaway construct.
 * - setTextureLoadCallback is never called: the constructor wires a
 *   replay-last-chain callback, and replacing it is how a still-streaming
 *   texture ends up rendered blank.
 * - The preview owns its Image outright (loaded from its own File). Disposal
 *   revokes blob URLs, so borrowing the editor's source would let whichever
 *   surface disposes first blind the other.
 */

const DRAFT_PREVIEW_KEY = 'draft-preview'

export interface EffectPreview {
  canvasRef: (el: HTMLCanvasElement | null) => void
  image: Image | null
  loadSample: () => Promise<void>
  loadFile: (file: File) => Promise<void>
  showEffect: (effect: ShaderEffect, values: ShaderInputVars) => void
}

export function useEffectPreview(): EffectPreview {
  const [image, setImage] = useState<Image | null>(null)
  const canvasElRef = useRef<HTMLCanvasElement | null>(null)
  const adapterRef = useRef<ThreeJSRenderingAdapter | null>(null)
  const repoRef = useRef<InMemoryShaderRepositoryAdapter | null>(null)
  const renderEditRef = useRef<RenderEditUseCase | null>(null)
  const { loadFromFile } = useImageLoader()

  const engine = useCallback((): RenderEditUseCase | null => {
    const canvas = canvasElRef.current
    if (!canvas) return null
    if (!adapterRef.current) {
      const adapter = new ThreeJSRenderingAdapter(canvas)
      const repo = new InMemoryShaderRepositoryAdapter()
      adapterRef.current = adapter
      repoRef.current = repo
      renderEditRef.current = new RenderEditUseCase(repo, adapter)
    }
    return renderEditRef.current
  }, [])

  const canvasRef = useCallback((el: HTMLCanvasElement | null) => {
    canvasElRef.current = el
  }, [])

  // Dispose on unmount only. Disposal also revokes the test image's blob URL
  // (the adapter's texture cache owns it by then), which is correct: the
  // image is this surface's own.
  useEffect(() => {
    return () => {
      adapterRef.current?.dispose()
      adapterRef.current = null
      repoRef.current = null
      renderEditRef.current = null
    }
  }, [])

  const loadFile = useCallback(
    async (file: File) => {
      const next = await loadFromFile(file)
      setImage((prev) => {
        // The old image belongs to this surface alone; release it. The
        // adapter's cached texture for it is replaced on the next render.
        prev?.dispose()
        return next
      })
    },
    [loadFromFile]
  )

  const loadSample = useCallback(async () => {
    const file = await urlToFile(SAMPLE_IMAGE_URL, 'sample')
    if (file) await loadFile(file) // a failed fetch just doesn't load — urlToFile's contract
  }, [loadFile])

  const showEffect = useCallback((effect: ShaderEffect, values: ShaderInputVars) => {
    const renderEdit = engine()
    if (!renderEdit || !image || !repoRef.current || !adapterRef.current) return
    // Size the buffer to the image so the render is pixel-true to it.
    const dims = image.getDimensions()
    adapterRef.current.updateDimensions(new Dimensions(dims.width, dims.height))
    repoRef.current.register(DRAFT_PREVIEW_KEY, effect)
    renderEdit.execute(
      EditPipeline.empty().withSource(image),
      [
        {
          type: DRAFT_PREVIEW_KEY,
          params: { ...effect.defaultValues, ...values, imageTexture: image },
        },
      ],
      dims.toArray()
    )
  }, [engine, image])

  return { canvasRef, image, loadSample, loadFile, showEffect }
}
