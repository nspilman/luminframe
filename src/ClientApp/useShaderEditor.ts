import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRenderingEngine } from '@/hooks/useRenderingEngine'
import { useImageLoader } from '@/hooks/useImageLoader'
import { useWindowSize } from '@/hooks/useWindowSize'
import { ShaderType, ShaderInputVars } from '@/types/shader'
import { Dimensions } from '@/domain/value-objects/Dimensions'
import { Image } from '@/domain/models/Image'
import { EditPipeline } from '@/domain/models/EditPipeline'
import { shaderLibrary } from '@/lib/shaders'

/**
 * Reconcile parameter values across an effect switch.
 *
 * The new effect's defaults define the parameter surface. A prior value carries
 * forward when the new effect shares that parameter, or when it is a loaded
 * image — the source image is the subject of the editor and outlives any single
 * effect. Settings unique to the effect being left are intentionally forgotten,
 * so the resulting params mirror the active effect's surface exactly (no stale
 * keys reaching the renderer as phantom uniforms).
 */
export function reconcileShaderParams(
  prev: ShaderInputVars,
  newDefaults: ShaderInputVars
): ShaderInputVars {
  const reconciled: ShaderInputVars = { ...newDefaults }
  for (const [key, value] of Object.entries(prev)) {
    if (key in newDefaults || value instanceof Image) {
      reconciled[key] = value
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
  const [selectedShader, setSelectedShader] = useState<ShaderType>('lightThresholdSwap')
  const [varValues, setVarValues] = useState<ShaderInputVars>(
    () => ({ ...shaderLibrary[selectedShader].defaultValues })
  )
  const [canvasDimensions, setCanvasDimensions] = useState<Dimensions | null>(null)
  const [pipeline, setPipeline] = useState<EditPipeline>(() => EditPipeline.empty())

  const { canvasRef, renderEdit, saveCanvasAsInput, downloadImage, updateDimensions, isInitialized } =
    useRenderingEngine()
  const { loadFromFile } = useImageLoader()
  const windowSize = useWindowSize()

  const effect = shaderLibrary[selectedShader]
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

  // Reconcile parameters when the selected effect changes.
  useEffect(() => {
    setVarValues(prev => reconcileShaderParams(prev, effect.defaultValues))
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
    renderEdit(committed, { type: selectedShader, params: varValues }, resolution)
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
    },
    []
  )

  // Commit the live draft as a new effect on top of the pipeline (stack-forward:
  // each Apply adds, never replaces), then open a fresh draft of the same effect
  // on the new base. The committed values now live in the pipeline, so the
  // canvas keeps showing them — the fresh draft starts from defaults on top.
  const handleApply = useCallback(() => {
    setPipeline(prev => prev.append(selectedShader, varValues))
    setVarValues(prev =>
      freshDraftParams(prev, shaderLibrary[selectedShader].defaultValues)
    )
  }, [selectedShader, varValues])

  const handleRemoveEffect = useCallback((index: number) => {
    setPipeline(prev => prev.removeAt(index))
  }, [])

  const handleMoveEffect = useCallback((from: number, to: number) => {
    setPipeline(prev => prev.move(from, to))
  }, [])

  const handleSaveImage = useCallback(
    async (inputImage: 'one' | 'two' = 'one') => {
      try {
        const image = await saveCanvasAsInput()
        if (inputImage === 'two') {
          // The blend/threshold second input is a per-effect parameter, not a
          // new source — the committed pipeline stays intact.
          updateVarValue('imageTextureTwo', image)
        } else {
          // Baking the canvas as the new source folds every committed effect
          // into the pixels, so the pipeline starts empty over the new base.
          setPipeline(EditPipeline.empty())
          updateVarValue('imageTexture', image)
        }
      } catch (error) {
        console.error('Failed to save canvas as image:', error)
      }
    },
    [saveCanvasAsInput, updateVarValue]
  )

  const handleDownload = useCallback(async () => {
    try {
      await downloadImage(`luminframe-${selectedShader}.png`)
    } catch (error) {
      console.error('Failed to download image:', error)
    }
  }, [downloadImage, selectedShader])

  // Dropping a file onto the canvas loads it as the source image, the same
  // slot the sidebar's upload fills — one loader (the door), two entry points.
  const handleImageDrop = useCallback(async (file: File) => {
    try {
      const image = await loadFromFile(file)
      // A new source is a fresh edit — the prior stack belonged to the old image.
      setPipeline(EditPipeline.empty())
      updateVarValue('imageTexture', image)
    } catch (error) {
      console.error('Failed to load image:', error)
    }
  }, [loadFromFile, updateVarValue])

  return {
    canvasRef,
    selectedShader,
    setSelectedShader,
    effect,
    varValues,
    resolution,
    updateVarValue,
    aspectRatioArray,
    hasImage,
    appliedEffects: pipeline.effects,
    handleApply,
    handleRemoveEffect,
    handleMoveEffect,
    handleSaveImage,
    handleDownload,
    handleImageDrop,
    handleCanvasResize,
  }
}
