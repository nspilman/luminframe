import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useRenderingEngine } from '@/hooks/useRenderingEngine'
import { useImageLoader } from '@/hooks/useImageLoader'
import { useWindowSize } from '@/hooks/useWindowSize'
import { useAsyncStatus } from '@/hooks/useAsyncStatus'
import { EffectKey, EffectRegistry, ShaderInputVars, ShaderInputDefinition } from '@/types/shader'
import { Dimensions } from '@/domain/value-objects/Dimensions'
import { Image } from '@/domain/models/Image'
import { EditPipeline } from '@/domain/models/EditPipeline'
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
 * image — a second-image input (blend, displacement) is expensive to re-pick and
 * survives a switch. Settings unique to the effect being left are intentionally
 * forgotten, so the resulting params mirror the active effect's surface exactly
 * (no stale keys reaching the renderer as phantom uniforms).
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
 * Owns the shader-editor state and orchestration: which effect is selected,
 * its parameter values, and the render/resize/save wiring against the
 * rendering engine. Keeps ClientApp purely presentational.
 *
 * `registry` is every effect resolvable right now — builtins plus the user's
 * loaded custom effects — and is the only place a key becomes an effect here.
 * `registryReady` is false only while custom effects are still being fetched;
 * session restore waits for it so a snapshot referencing a custom effect
 * isn't judged against a registry that hasn't finished assembling.
 */
export function useShaderEditor(registry: EffectRegistry, registryReady: boolean) {
  // No effect is selected on a fresh visit: the editor lands showing the image
  // untouched, and the picker highlights nothing until the user chooses one. An
  // empty pipeline renders the original (see RenderEditUseCase), so there's no
  // arbitrary default look imposed on the image. A restored session overrides
  // this with its saved selection.
  const [selectedShader, setSelectedShader] = useState<EffectKey | null>(null)
  const [varValues, setVarValues] = useState<ShaderInputVars>(() => ({}))
  const [canvasDimensions, setCanvasDimensions] = useState<Dimensions | null>(null)

  // Which committed effect the live draft is revising, or null when the draft
  // is a new effect headed for the top of the stack. This one number is the
  // whole difference between the two ways of tuning: null renders the draft as
  // an extra pass after everything committed, a number renders it *in place of*
  // the effect at that index, so what you see while dragging a slider is the
  // effect doing its work where it actually sits in the order — with the steps
  // above it still folded on top.
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  // The photo being edited — the subject of the whole session, so it gets a
  // place of its own rather than riding in varValues (the effect's knobs) or in
  // the pipeline (which lives inside the undo history, where an undo would swap
  // the user's photo out from under them). The pipeline borrows it at render
  // time via withSource; that join is the only place the two meet.
  const [source, setSource] = useState<Image | null>(null)
  const hasImage = source !== null

  // Effects the user has committed to (applied or downloaded), most-recent
  // first, seeded from and mirrored back to localStorage so they persist across
  // visits. Recording is deliberate — see recordRecent's callers, not selection.
  const [recentShaders, setRecentShaders] = useState<EffectKey[]>(() => loadRecents())
  const recordRecent = useCallback((type: EffectKey) => {
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

  // Null when nothing is selected — or when the selection's key no longer
  // resolves (a restored custom effect whose record is gone).
  const effect = selectedShader ? registry[selectedShader] ?? null : null

  // Derive aspect ratio from image dimensions (or 1:1 if no image).
  const aspectRatio = useMemo(
    () => source?.getDimensions() ?? new Dimensions(1, 1),
    [source]
  )

  const aspectRatioArray = useMemo(() => aspectRatio.toArray(), [aspectRatio])

  // What passes read as the `resolution` uniform: the source's own pixel size,
  // so the live view predicts the export. Falls back to the window before a
  // photo is loaded, when there is nothing else to size against.
  const sourceSize: [number, number] = source
    ? source.getDimensions().toArray()
    : windowSize.toArray()

  const sourceUrl = source?.data.url ?? null

  // Restore a persisted edit once, as soon as the registry has settled. This is
  // what carries the in-progress work across the OAuth sign-in redirect (and any
  // reload): the snapshot taken before navigating away is rehydrated here —
  // source image, committed effects, and live draft — then consumed so a later
  // clean visit starts empty. Waiting for registryReady matters: a snapshot may
  // reference a custom effect still being fetched, and judging it against a
  // half-assembled registry would wrongly drop it. Steps whose key still doesn't
  // resolve after that (the record was deleted) are dropped with one warning —
  // this is the door that keeps unresolvable keys out of the pipeline, so the
  // render path never needs to guard.
  const restoredRef = useRef(false)
  useEffect(() => {
    if (!registryReady || restoredRef.current) return
    restoredRef.current = true
    const saved = loadEditorSession()
    if (!saved) return
    let active = true
    deserializeSession(saved)
      .then(({ source: restoredSource, selectedShader: shader, draftVars, effects }) => {
        if (!active) return
        const kept = effects.filter((e) => e.type in registry)
        const droppedKeys = effects.filter((e) => !(e.type in registry)).map((e) => e.type)
        const keptShader = shader && shader in registry ? shader : null
        if (shader && !keptShader) droppedKeys.push(shader)
        if (droppedKeys.length > 0) {
          console.warn('Restored session referenced effects that no longer resolve; dropped:', droppedKeys)
        }
        setSource(restoredSource)
        setSelectedShader(keptShader)
        setVarValues(draftVars)
        setHistory(
          initHistory(
            kept.reduce((p, e) => p.append(e.type, e.params), EditPipeline.empty())
          )
        )
      })
      .catch(err => console.warn('Could not restore editor session:', err))
      .finally(() => clearEditorSession())
    return () => {
      active = false
    }
  }, [registryReady, registry])

  // Snapshot the current edit to localStorage. Called right before a sign-in
  // redirect so the work isn't lost when the page navigates away. No-op without
  // an image — there's nothing worth restoring.
  const captureSession = useCallback(async (): Promise<void> => {
    if (!source) return
    try {
      const snapshot = await serializeSession({
        source,
        selectedShader,
        draftVars: varValues,
        effects: pipeline.effects,
      })
      saveEditorSession(snapshot)
    } catch (err) {
      console.warn('Could not capture editor session:', err)
    }
  }, [source, selectedShader, varValues, pipeline.effects])

  // Reconcile parameters when the selected effect changes. Nothing to reconcile
  // when the selection is cleared to "no effect" — the draft params just go
  // unused. Re-running when the registry updates is idempotent: reconciling
  // against unchanged defaults returns the same values.
  useEffect(() => {
    if (!selectedShader) return
    const next = registry[selectedShader]
    if (!next) return
    setVarValues(prev => reconcileShaderParams(prev, next.defaultValues, next.inputs))
  }, [selectedShader, registry])

  // Render whenever the committed pipeline, the live draft effect, its
  // parameters, or the canvas size change. The committed effects fold over the
  // source; the selected effect renders as the live draft on top.
  useEffect(() => {
    if (!isInitialized || !source || !canvasDimensions) {
      return
    }
    // Where the source and the pipeline meet: the pipeline is anchored to the
    // current photo for this render only, so undo can move through the stack
    // without ever moving the photo.
    //
    // Revising a committed effect substitutes the live values into the stack at
    // that effect's own index; a new effect rides on top as a draft pass. Both
    // are previews of an uncommitted change — the difference is only where in
    // the fold the change belongs.
    const revising = editingIndex !== null && selectedShader !== null
    const committed = (revising ? pipeline.replaceAt(editingIndex, varValues) : pipeline).withSource(source)
    // No selected effect → no draft passes; with an empty committed stack the
    // chain is empty and the renderer shows the original.
    const drafts = selectedShader && !revising ? [{ type: selectedShader, params: varValues }] : []
    renderEdit(committed, drafts, sourceSize)
  }, [isInitialized, selectedShader, varValues, source, renderEdit, sourceSize, canvasDimensions, pipeline, editingIndex])

  // handleCanvasResize updates the renderer to the actual canvas size; the
  // resulting canvasDimensions change drives the render effect above.
  const handleCanvasResize = useCallback((dims: Dimensions) => {
    updateDimensions(dims)
    setCanvasDimensions(dims)
  }, [updateDimensions])

  const updateVarValue = useCallback(
    (key: keyof ShaderInputVars, value: ShaderInputVars[string]) => {
      setVarValues(prev => ({ ...prev, [key]: value }))
    },
    []
  )

  // Commit the live draft. A new effect goes on top of the pipeline
  // (stack-forward: each Apply adds); a revision goes back into the slot it
  // came from, keeping its place in the order. Either way the commit consumes
  // the draft: the values now live in the pipeline, so the canvas keeps showing
  // them and nothing stays selected. Without that last part, an applied
  // animated effect kept riding the chain as a live draft — turning every later
  // download and save into a video even when the committed edit was a still.
  const handleApply = useCallback(() => {
    if (!selectedShader || !effect) return
    setHistory(h =>
      pushHistory(
        h,
        editingIndex !== null
          ? h.present.replaceAt(editingIndex, varValues)
          : h.present.append(selectedShader, varValues)
      )
    )
    setVarValues({ ...effect.defaultValues })
    recordRecent(selectedShader)
    setSelectedShader(null)
    setEditingIndex(null)
  }, [selectedShader, effect, varValues, recordRecent, editingIndex])

  // Open a committed effect for retuning, in its own place in the chain. Its
  // committed values seed the draft, so the sliders open where the effect was
  // left rather than at the factory defaults.
  const editAppliedEffect = useCallback((index: number) => {
    const applied = pipeline.effects[index]
    if (!applied) return
    setSelectedShader(applied.type)
    setVarValues({ ...applied.params })
    setEditingIndex(index)
  }, [pipeline])

  // Leave a revision without committing it. The draft is dropped, so the canvas
  // returns to the committed stack.
  const cancelEdit = useCallback(() => {
    setSelectedShader(null)
    setEditingIndex(null)
  }, [])

  // Selecting from the library toggles: clicking the selected effect again
  // deselects it. Browsing an effect must always be reversible — otherwise a
  // glance at Wave leaves an animated draft stuck on the chain with no way off
  // short of picking a different effect. Choosing from the library is always
  // starting a new effect, so it ends any revision in progress.
  const selectShader = useCallback((shader: EffectKey) => {
    setSelectedShader(prev => (prev === shader ? null : shader))
    setEditingIndex(null)
  }, [])

  // Restructuring the stack moves the slot a revision is aimed at. The index
  // follows its effect rather than being cleared, so reordering mid-tune costs
  // nothing; removing the very effect being revised ends the revision, since
  // its slot is gone.
  // Both of these decide where the revision lands *before* touching state.
  // Removing one also clears the selection, and two pieces of state moving
  // together is exactly what an updater function cannot express: React is free
  // to call an updater more than once, so it is no place to put a second
  // setter (see useNetworkEffects, where that shape fired a network fan-out
  // twice). Reading editingIndex from the closure is safe here because both
  // handlers are user gestures — one click, one render between them.
  const handleRemoveEffect = useCallback((index: number) => {
    setHistory(h => pushHistory(h, h.present.removeAt(index)))
    if (editingIndex === null) return
    if (editingIndex === index) {
      setSelectedShader(null)
      setEditingIndex(null)
    } else if (editingIndex > index) {
      setEditingIndex(editingIndex - 1)
    }
  }, [editingIndex])

  const handleMoveEffect = useCallback((from: number, to: number) => {
    setHistory(h => pushHistory(h, h.present.move(from, to)))
    if (editingIndex === null) return
    if (editingIndex === from) setEditingIndex(to)
    // A step passing over the revised one shifts it by exactly one slot.
    else if (from < editingIndex && to >= editingIndex) setEditingIndex(editingIndex - 1)
    else if (from > editingIndex && to <= editingIndex) setEditingIndex(editingIndex + 1)
  }, [editingIndex])

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
      // an animated edit, .png for a still). Named for the effect being tuned,
      // else the last committed one — Apply clears the selection, so the
      // committed stack is what usually carries the edit's name. The display
      // name is slugified rather than using the key: a custom effect's key is
      // an AT-URI, which has no business in a filename.
      const namesakeKey = selectedShader ?? pipeline.effects[pipeline.effects.length - 1]?.type
      const namesake = namesakeKey
        ? registry[namesakeKey]?.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? 'custom'
        : 'image'
      await downloadImage(`luminframe-${namesake}`)
      if (selectedShader) recordRecent(selectedShader)
    } catch (error) {
      console.error('Failed to download image:', error)
    }
  }, [downloadImage, selectedShader, pipeline, registry, recordRecent])

  // Loading a source is the slowest first-contact in the editor, so it is the
  // first surface to adopt the app's loading-state SoT: useAsyncStatus tracks the
  // in-flight load, and the canvas shows a LoadingOverlay until the image lands.
  // Both entry points — canvas drop and click-to-choose — funnel through this one
  // task, the same slot the sidebar's upload fills (one door, two doorways).
  const loadImage = useAsyncStatus(
    useCallback(async (file: File, parent?: StrongRef) => {
      const image = await loadFromFile(file)
      // The stack survives the swap. It holds no source of its own — it borrows
      // one at render time — so it belongs to the session, not to the photo, and
      // trying the same look on a second photo costs one drop rather than a
      // rebuild. A recipe applied before any image was loaded has been waiting
      // for exactly this moment, so it lands here as the stack.
      const pending = pendingRecipeRef.current
      pendingRecipeRef.current = null
      if (pending) {
        const recipe = pending.reduce((p, s) => p.append(s.type, s.params), EditPipeline.empty())
        setHistory(h => pushHistory(h, recipe))
      }
      setSource(image)
      // A plain load passes no parent, so provenance clears; a remix passes the
      // record it came from. Set here because this is the one door a source
      // enters by, which is what keeps a fresh photo from inheriting a false parent.
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
    selectShader,
    recentShaders,
    effect,
    varValues,
    // Named for the uniform here because that is what the sidebar merges it in
    // as: an effect declaring a `resolution` input reads this live value.
    resolution: sourceSize,
    updateVarValue,
    aspectRatioArray,
    hasImage,
    source,
    sourceUrl,
    isLoadingImage: loadImage.isPending,
    appliedEffects: pipeline.effects,
    editingIndex,
    editAppliedEffect,
    cancelEdit,
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
