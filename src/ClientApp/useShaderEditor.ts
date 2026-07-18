import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useRenderingEngine } from '@/hooks/useRenderingEngine'
import { useImageLoader } from '@/hooks/useImageLoader'
import { useWindowSize } from '@/hooks/useWindowSize'
import { useAsyncStatus } from '@/hooks/useAsyncStatus'
import { ShaderType, ShaderInputVars, ShaderInputDefinition } from '@/types/shader'
import { Dimensions } from '@/domain/value-objects/Dimensions'
import { Image } from '@/domain/models/Image'
import { EditPipeline } from '@/domain/models/EditPipeline'
import { shaderLibrary } from '@/lib/shaders'
import { HydratedStep } from '@/lib/shaders/hydrateRecipe'
import { StrongRef } from '@/types/atproto'
import { pushRecent, loadRecents, saveRecents } from '@/lib/shaders/recentEffects'
import { SECOND_IMAGE_INPUT } from '@/lib/shaders/constants'
import {
  History,
  initHistory,
  pushHistory,
  undo,
  redo,
  canUndo,
  canRedo,
} from '@/lib/history'
import {
  serializeSession,
  deserializeSession,
  saveEditorSession,
  loadEditorSession,
  clearEditorSession,
} from '@/lib/editorSession'

/**
 * Reconcile parameter values across an effect switch.
 *
 * The new effect's defaults define the parameter surface. A prior value carries
 * forward when the new effect shares that parameter, or when it is a loaded
 * image — the source image is the subject of the editor and outlives any single
 * effect. Settings unique to the effect being left are intentionally forgotten,
 * so the resulting params mirror the active effect's surface exactly (no stale
 * keys reaching the renderer as phantom uniforms).
 *
 * A shared name means different things in different effects, though — one
 * effect's `amount` ranges 0–0.6, another's -8–8. So a carried number is clamped
 * into the *new* effect's range (via newInputs), keeping the slider honest and
 * the value in-bounds rather than pinned off the end of its own track.
 */
export function reconcileShaderParams(
  prev: ShaderInputVars,
  newDefaults: ShaderInputVars,
  newInputs: Record<string, ShaderInputDefinition> = {}
): ShaderInputVars {
  const reconciled: ShaderInputVars = { ...newDefaults }
  for (const [key, value] of Object.entries(prev)) {
    if (value instanceof Image) {
      reconciled[key] = value
    } else if (key in newDefaults) {
      const input = newInputs[key]
      reconciled[key] =
        input?.type === 'range' && typeof value === 'number'
          ? Math.min(input.max, Math.max(input.min, value))
          : value
    }
  }
  return reconciled
}

/**
 * The parameters a fresh draft starts with after the current effect is applied:
 * the effect's own defaults, but with the source image carried forward.
 *
 * Carrying the source is load-bearing — `hasImage` is derived from
 * `imageTexture`, so dropping it would send the whole editor back to its
 * dormant, image-less state the instant the user clicks Apply. Unlike
 * reconcileShaderParams (an effect *switch*, where tuned values survive), an
 * Apply deliberately resets the knobs: the tuned values were just committed into
 * the pipeline, so the new draft is a clean slate on top of them.
 */
export function freshDraftParams(
  prev: ShaderInputVars,
  defaults: ShaderInputVars
): ShaderInputVars {
  const fresh: ShaderInputVars = { ...defaults }
  if (prev.imageTexture instanceof Image) {
    fresh.imageTexture = prev.imageTexture
  }
  return fresh
}

/**
 * Owns the shader-editor state and orchestration: which effect is selected,
 * its parameter values, and the render/resize/save wiring against the
 * rendering engine. Keeps ClientApp purely presentational.
 */
export function useShaderEditor() {
  // No effect is selected on a fresh visit: the editor lands showing the image
  // untouched, and the picker highlights nothing until the user chooses one. An
  // empty pipeline renders the original (see RenderEditUseCase), so there's no
  // arbitrary default look imposed on the image. A restored session overrides
  // this with its saved selection.
  const [selectedShader, setSelectedShader] = useState<ShaderType | null>(null)
  const [varValues, setVarValues] = useState<ShaderInputVars>(() => ({}))
  const [canvasDimensions, setCanvasDimensions] = useState<Dimensions | null>(null)

  // Effects the user has committed to (applied or downloaded), most-recent
  // first, seeded from and mirrored back to localStorage so they persist across
  // visits. Recording is deliberate — see recordRecent's callers, not selection.
  const [recentShaders, setRecentShaders] = useState<ShaderType[]>(() => loadRecents())
  const recordRecent = useCallback((type: ShaderType) => {
    setRecentShaders((prev) => pushRecent(prev, type))
  }, [])
  // Mirror recents to storage whenever they change (the initial write-back of the
  // loaded value is idempotent), keeping the persistence out of the state updater.
  useEffect(() => {
    saveRecents(recentShaders)
  }, [recentShaders])

  // The committed pipeline lives inside an undo/redo history. Every commit-level
  // action (apply, remove, reorder) pushes a new present; undo/redo step through
  // them. The live draft (selectedShader/varValues) is deliberately outside the
  // history — undo works at the granularity of committed effects, not slider drags.
  const [history, setHistory] = useState<History<EditPipeline>>(
    () => initHistory(EditPipeline.empty())
  )
  const pipeline = history.present

  const {
    canvasRef,
    renderEdit,
    saveCanvasAsInput,
    downloadImage,
    encodeAnimatedEdit,
    updateDimensions,
    isInitialized,
  } = useRenderingEngine()
  const { loadFromFile } = useImageLoader()
  const windowSize = useWindowSize()

  // Remix provenance: the record the current source was remixed from, or null.
  // Lives next to the source because that's what it describes. Set only when a
  // remix loads the source; cleared whenever the source is replaced by any other
  // load, so a fresh image can never inherit a false parent.
  const [remixParent, setRemixParent] = useState<StrongRef | null>(null)

  // A recipe applied before any image was loaded, waiting to land on the first
  // source. A ref (not state) — it's consumed inside the load task and needs no render.
  const pendingRecipeRef = useRef<HydratedStep[] | null>(null)

  const effect = selectedShader ? shaderLibrary[selectedShader] : null
  const hasImage =
    'imageTexture' in varValues && varValues.imageTexture instanceof Image

  // Derive aspect ratio from image dimensions (or 1:1 if no image).
  const aspectRatio = useMemo(() => {
    if (hasImage) {
      return (varValues.imageTexture as Image).getDimensions()
    }
    return new Dimensions(1, 1)
  }, [hasImage, varValues.imageTexture])

  const aspectRatioArray = useMemo(() => aspectRatio.toArray(), [aspectRatio])

  // Resolution prefers the image's dimensions, falling back to the window.
  const resolution: [number, number] = hasImage
    ? (varValues.imageTexture as Image).getDimensions().toArray()
    : windowSize.toArray()

  // The untouched source image, anchor of the edit. Null until one is loaded.
  // Its identity is stable across param tweaks — only a new load or save-as-
  // source swaps it — so consumers can key expensive work (thumbnails) on it.
  const source = hasImage ? (varValues.imageTexture as Image) : null
  const sourceUrl = source ? source.data.url : null

  // Restore a persisted edit once on mount. This is what carries the in-progress
  // work across the OAuth sign-in redirect (and any reload): the snapshot taken
  // before navigating away is rehydrated here — source image, committed effects,
  // and live draft — then consumed so a later clean visit starts empty.
  useEffect(() => {
    const saved = loadEditorSession()
    if (!saved) return
    let active = true
    deserializeSession(saved)
      .then(({ selectedShader: shader, draftVars, effects }) => {
        if (!active) return
        setSelectedShader(shader)
        setVarValues(draftVars)
        setHistory(
          initHistory(
            effects.reduce((p, e) => p.append(e.type, e.params), EditPipeline.empty())
          )
        )
      })
      .catch(err => console.warn('Could not restore editor session:', err))
      .finally(() => clearEditorSession())
    return () => {
      active = false
    }
  }, [])

  // Snapshot the current edit to localStorage. Called right before a sign-in
  // redirect so the work isn't lost when the page navigates away. No-op without
  // an image — there's nothing worth restoring.
  const captureSession = useCallback(async (): Promise<void> => {
    if (!hasImage) return
    try {
      const snapshot = await serializeSession({
        selectedShader,
        draftVars: varValues,
        effects: pipeline.effects,
      })
      saveEditorSession(snapshot)
    } catch (err) {
      console.warn('Could not capture editor session:', err)
    }
  }, [hasImage, selectedShader, varValues, pipeline.effects])

  // Reconcile parameters when the selected effect changes. Nothing to reconcile
  // when the selection is cleared to "no effect" — the draft params just go unused.
  useEffect(() => {
    if (!selectedShader) return
    const next = shaderLibrary[selectedShader]
    setVarValues(prev => reconcileShaderParams(prev, next.defaultValues, next.inputs))
  }, [selectedShader])

  // Render whenever the committed pipeline, the live draft effect, its
  // parameters, or the canvas size change. The committed effects fold over the
  // source; the selected effect renders as the live draft on top.
  useEffect(() => {
    if (!isInitialized || !hasImage || !canvasDimensions) {
      return
    }
    const source = varValues.imageTexture as Image
    const committed = pipeline.withSource(source)
    // No selected effect → no draft; with an empty committed stack the chain is
    // empty and the renderer shows the original.
    const draft = selectedShader ? { type: selectedShader, params: varValues } : null
    renderEdit(committed, draft, resolution)
  }, [isInitialized, selectedShader, varValues, hasImage, renderEdit, resolution, canvasDimensions, pipeline])

  // handleCanvasResize updates the renderer to the actual canvas size; the
  // resulting canvasDimensions change drives the render effect above.
  const handleCanvasResize = useCallback((dims: Dimensions) => {
    updateDimensions(dims)
    setCanvasDimensions(dims)
  }, [updateDimensions])

  const updateVarValue = useCallback(
    (key: keyof ShaderInputVars, value: ShaderInputVars[string]) => {
      setVarValues(prev => ({ ...prev, [key]: value }))
      // Swapping the source image (e.g. via the sidebar) is not a remix — drop
      // any lineage so it isn't wrongly attributed to the new source.
      if (key === 'imageTexture') setRemixParent(null)
    },
    []
  )

  // Commit the live draft as a new effect on top of the pipeline (stack-forward:
  // each Apply adds, never replaces), then open a fresh draft of the same effect
  // on the new base. The committed values now live in the pipeline, so the
  // canvas keeps showing them — the fresh draft starts from defaults on top.
  const handleApply = useCallback(() => {
    if (!selectedShader) return
    setHistory(h => pushHistory(h, h.present.append(selectedShader, varValues)))
    setVarValues(prev =>
      freshDraftParams(prev, shaderLibrary[selectedShader].defaultValues)
    )
    recordRecent(selectedShader)
  }, [selectedShader, varValues, recordRecent])

  const handleRemoveEffect = useCallback((index: number) => {
    setHistory(h => pushHistory(h, h.present.removeAt(index)))
  }, [])

  const handleMoveEffect = useCallback((from: number, to: number) => {
    setHistory(h => pushHistory(h, h.present.move(from, to)))
  }, [])

  const handleUndo = useCallback(() => setHistory(undo), [])
  const handleRedo = useCallback(() => setHistory(redo), [])

  // ⌘Z / Ctrl+Z undoes a commit; adding Shift (or ⌘Y) redoes. setHistory's
  // undo/redo are no-ops at the ends of history, so the guards stay simple.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      const key = e.key.toLowerCase()
      if (key === 'z') {
        e.preventDefault()
        setHistory(e.shiftKey ? redo : undo)
      } else if (key === 'y') {
        e.preventDefault()
        setHistory(redo)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const handleSaveAsSecondImage = useCallback(
    async () => {
      try {
        // The blend/threshold second input is a per-effect parameter, not a
        // new source — the committed pipeline stays intact.
        const image = await saveCanvasAsInput()
        updateVarValue(SECOND_IMAGE_INPUT, image)
      } catch (error) {
        console.error('Failed to save canvas as second image:', error)
      }
    },
    [saveCanvasAsInput, updateVarValue]
  )

  const handleDownload = useCallback(async () => {
    try {
      // Base name only — the exporter picks the extension by content (.mp4 for
      // an animated edit, .png for a still).
      await downloadImage(`luminframe-${selectedShader ?? 'image'}`)
      if (selectedShader) recordRecent(selectedShader)
    } catch (error) {
      console.error('Failed to download image:', error)
    }
  }, [downloadImage, selectedShader, recordRecent])

  // Loading a source is the slowest first-contact in the editor, so it is the
  // first surface to adopt the app's loading-state SoT: useAsyncStatus tracks the
  // in-flight load, and the canvas shows a LoadingOverlay until the image lands.
  // Both entry points — canvas drop and click-to-choose — funnel through this one
  // task, the same slot the sidebar's upload fills (one door, two doorways).
  const loadImage = useAsyncStatus(
    useCallback(async (file: File, parent?: StrongRef) => {
      const image = await loadFromFile(file)
      // A new source is a fresh edit — the prior stack belonged to the old image.
      // The exception: a recipe applied before any image was loaded is waiting to
      // land on the first source, so it becomes the fresh stack instead of nothing.
      const pending = pendingRecipeRef.current
      pendingRecipeRef.current = null
      const base = pending
        ? pending.reduce((p, s) => p.append(s.type, s.params), EditPipeline.empty())
        : EditPipeline.empty()
      setHistory(initHistory(base))
      // Set the source directly (not via updateVarValue, whose imageTexture clear
      // would wipe the provenance we set here for a remix). A plain load passes no
      // parent, so provenance clears; a remix passes the record it came from.
      setVarValues(prev => ({ ...prev, imageTexture: image }))
      setRemixParent(parent ?? null)
    }, [loadFromFile])
  )
  const handleImageDrop = useCallback((file: File) => loadImage.run(file), [loadImage.run])
  const handleRemixLoad = useCallback(
    (file: File, parent?: StrongRef) => loadImage.run(file, parent),
    [loadImage.run]
  )

  // Apply a saved recipe (someone's look) to the current image. Replaces the
  // committed stack — pushed, so the previous stack is one undo away — and keeps
  // the source. With no image yet, it's held until the next load (see loadImage),
  // so "pick a look, then choose a photo" works too.
  const applyRecipe = useCallback(
    (steps: HydratedStep[]) => {
      if (steps.length === 0) return
      if (hasImage) {
        const recipePipeline = steps.reduce(
          (p, s) => p.append(s.type, s.params),
          EditPipeline.empty()
        )
        setHistory(h => pushHistory(h, recipePipeline))
        pendingRecipeRef.current = null
      } else {
        pendingRecipeRef.current = steps
      }
    },
    [hasImage]
  )

  return {
    canvasRef,
    selectedShader,
    setSelectedShader,
    recentShaders,
    effect,
    varValues,
    resolution,
    updateVarValue,
    aspectRatioArray,
    hasImage,
    source,
    sourceUrl,
    isLoadingImage: loadImage.isPending,
    appliedEffects: pipeline.effects,
    handleApply,
    handleRemoveEffect,
    handleMoveEffect,
    handleUndo,
    handleRedo,
    canUndo: canUndo(history),
    canRedo: canRedo(history),
    handleSaveAsSecondImage,
    handleDownload,
    encodeAnimatedEdit,
    handleImageDrop,
    handleRemixLoad,
    applyRecipe,
    remixParent,
    handleCanvasResize,
    captureSession,
  }
}
