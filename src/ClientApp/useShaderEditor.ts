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

  // Render whenever the effect, its parameters, or the canvas size change.
  // Phase 0: the committed pipeline is always empty, so the selected effect is a
  // single draft rendered directly on the source — identical to the prior
  // single-pass path. Apply (Phase 1) will start committing effects onto it.
  useEffect(() => {
    if (!isInitialized || !hasImage || !canvasDimensions) {
      return
    }
    const source = varValues.imageTexture as Image
    const pipeline = EditPipeline.empty().withSource(source)
    renderEdit(pipeline, { type: selectedShader, params: varValues }, resolution)
  }, [isInitialized, selectedShader, varValues, hasImage, renderEdit, resolution, canvasDimensions])

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

  const handleSaveImage = useCallback(
    async (inputImage: 'one' | 'two' = 'one') => {
      try {
        const image = await saveCanvasAsInput()
        const varKey = `imageTexture${inputImage === 'two' ? 'Two' : ''}`
        updateVarValue(varKey, image)
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
    handleSaveImage,
    handleDownload,
    handleImageDrop,
    handleCanvasResize,
  }
}
