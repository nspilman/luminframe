'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useRenderingEngine } from '@/hooks/useRenderingEngine'
import { useWindowSize } from '@/hooks/useWindowSize'
import { ShaderType, ShaderInputVars } from '@/types/shader'
import { ShaderControls } from './shader-controls'
import { EffectPicker } from '@/components/effect-picker'
import { Card, CardContent } from '@/components/ui/card'
import { HeaderBar } from '@/components/header-bar'
import { CanvasWorkspace } from '@/components/CanvasWorkspace'
import { Dimensions } from '@/domain/value-objects/Dimensions'
import { Image } from '@/domain/models/Image'
import { shaderLibrary } from '@/lib/shaders'
import { ApplicationContext } from '@/application/ApplicationContext'

export function ClientApp(): JSX.Element {
  const [selectedShader, setSelectedShader] = useState<ShaderType>("lightThresholdSwap")
  const [varValues, setVarValues] = useState<ShaderInputVars>(() => {
    const effect = shaderLibrary[selectedShader]
    return { ...effect.defaultValues }
  })

  const { canvasRef, render, getCanvas, updateDimensions, isInitialized } = useRenderingEngine()
  const windowSize = useWindowSize()
  const contextRef = useRef<ApplicationContext>()

  const hasImage = "imageTexture" in varValues && varValues.imageTexture instanceof Image
  const [canvasDimensions, setCanvasDimensions] = useState<Dimensions | null>(null)

  const effect = shaderLibrary[selectedShader]

  // Derive aspect ratio from image dimensions (or 1:1 if no image)
  const aspectRatio = useMemo(() => {
    if (hasImage) {
      const dims = (varValues.imageTexture as Image).getDimensions()
      console.log('[ClientApp] Aspect ratio from image:', dims.toString(), 'ratio:', dims.getAspectRatio())
      return dims
    }
    console.log('[ClientApp] No image, using 1:1 aspect ratio')
    return new Dimensions(1, 1)
  }, [hasImage, varValues.imageTexture])

  // Memoize the array to prevent unnecessary re-renders
  const aspectRatioArray = useMemo(() => {
    const arr = aspectRatio.toArray()
    console.log('[ClientApp] Aspect ratio array:', arr)
    return arr
  }, [aspectRatio])

  // Initialize application context
  useEffect(() => {
    if (!contextRef.current) {
      contextRef.current = ApplicationContext.getInstance();
    }
  }, []);

  // Calculate resolution from image dimensions or fallback to window size
  const resolution: [number, number] = hasImage
    ? (varValues.imageTexture as Image).getDimensions().toArray()
    : windowSize.toArray()

  // Update var values when shader changes
  useEffect(() => {
    setVarValues(prev => {
      const newDefaults = { ...effect.defaultValues }
      return {
        ...newDefaults,
        ...prev,
        // Filter to only keep values for keys that exist in newDefaults
        ...Object.fromEntries(
          Object.entries(prev).filter(([key]) => key in newDefaults)
        )
      }
    })
  }, [selectedShader])

  // Trigger render when parameters or shader changes
  useEffect(() => {
    console.log('[ClientApp] Render effect triggered:', { isInitialized, hasImage, canvasDimensions: canvasDimensions?.toString() });

    if (!isInitialized || !hasImage || !canvasDimensions) {
      console.log('[ClientApp] Render skipped - not ready');
      return;
    }

    console.log('[ClientApp] Executing render');
    const image = varValues.imageTexture as Image
    const paramsWithResolution = {
      ...varValues,
      resolution,
    }
    render(image, selectedShader, paramsWithResolution)
  }, [isInitialized, selectedShader, varValues, hasImage, render, resolution, canvasDimensions])

  // Note: We don't need to call updateDimensions with aspectRatio here
  // because handleCanvasResize already calls updateDimensions with the actual canvas size
  // The aspectRatio is just used for the CSS container sizing

  // Handle canvas resize - update renderer to match actual canvas size
  const handleCanvasResize = useCallback((dims: Dimensions) => {
    console.log('[ClientApp] Canvas resized to:', dims.toString());
    updateDimensions(dims);
    setCanvasDimensions(dims); // This triggers the render effect
  }, [updateDimensions]);

  const updateVarValue = useCallback((key: keyof ShaderInputVars, value: ShaderInputVars[string]) => {
    setVarValues(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  const handleSaveImage = useCallback(async (inputImage: "one" | "two" = "one") => {
    if (!contextRef.current) {
      console.error('ApplicationContext not initialized');
      return;
    }

    try {
      // Use the SaveCanvasAsInput use case
      const useCase = contextRef.current.getSaveCanvasAsInputUseCase();
      const image = await useCase.execute();

      // Update the appropriate image input
      const varKey = `imageTexture${inputImage === "two" ? "Two" : ""}`;
      updateVarValue(varKey, image);
    } catch (error) {
      console.error('Failed to save canvas as image:', error);
      // TODO: Show error notification to user
    }
  }, [updateVarValue]);

  return (
    <div className="flex flex-col min-h-screen bg-[#030305]">
      <HeaderBar />
      <div className="flex flex-col md:flex-row flex-1">
        {/* Left Sidebar */}
        <div className="relative md:w-[320px] border-b md:border-b-0 md:border-r border-zinc-800/50 bg-black/20 backdrop-blur-xl before:absolute before:inset-0 before:p-[1px] before:bg-gradient-to-r before:from-violet-500/20 before:via-indigo-500/20 before:to-purple-500/20 before:-z-10">
          <div className="p-4 space-y-4 md:space-y-6">
            <EffectPicker selectedShader={selectedShader} onShaderSelect={setSelectedShader} />
            
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-zinc-400">Adjustments</h3>
              <Card className="border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm">
                <CardContent className="p-4">
                  <ShaderControls
                    effect={effect}
                    values={{ ...varValues, resolution }}
                    onChange={updateVarValue}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="relative flex-1 before:absolute before:inset-0 before:bg-gradient-to-r before:from-violet-500/20 before:via-indigo-500/20 before:to-purple-500/20 before:-z-10">
          <div className="relative h-full rounded-lg border border-zinc-800/50 bg-black/20 backdrop-blur-xl before:absolute before:inset-0 before:rounded-lg  before:bg-gradient-to-r before:from-violet-500/20 before:via-indigo-500/20 before:to-purple-500/20 before:-z-10">
            <div className="h-[50vh] md:h-full">
              <CanvasWorkspace
                ref={canvasRef}
                dimensions={aspectRatioArray}
                hasImage={hasImage}
                onSaveImage={handleSaveImage}
                onCanvasResize={handleCanvasResize}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}