'use client'

import { useState, useRef, useCallback } from 'react'
import { ImageSceneHandle } from '../ImageScene'
import { useShader } from '@/hooks/useShader'
import { useCanvasExport } from '@/hooks/useCanvasExport'
import { ShaderType } from '@/types/shader'
import { ShaderControls } from './shader-controls'
import { EffectPicker } from '@/components/effect-picker'
import { Card, CardContent } from '@/components/ui/card'
import { AspectRatioPicker } from '@/components/aspect-ratio-picker'
import { HeaderBar } from '@/components/header-bar'
import { CanvasWorkspace } from '@/components/CanvasWorkspace'
import { Dimensions } from '@/domain/value-objects/Dimensions'
import { Image } from '@/domain/models/Image'

export function ClientApp(): JSX.Element {
  const [selectedShader, setSelectedShader] = useState<ShaderType>("lightThresholdSwap")
  const { shader, varValues, updateVarValue, effect } = useShader(selectedShader)
  const { exportCanvasAsImage } = useCanvasExport()

  const hasImage = "imageTexture" in varValues && varValues.imageTexture instanceof Image

  const [aspectRatio, setAspectRatio] = useState<Dimensions>(new Dimensions(1, 1))
  const imageSceneRef = useRef<ImageSceneHandle>(null)

  const handleSaveImage = useCallback(async (inputImage: "one" | "two" = "one") => {
    if (!imageSceneRef.current) {
      console.error('ImageScene ref not available')
      return
    }

    try {
      const canvas = imageSceneRef.current.getCanvas()
      if (!canvas) {
        throw new Error('Canvas not available')
      }

      // Export canvas as Image domain object
      const image = await exportCanvasAsImage(canvas)

      // Update the appropriate image input
      const varKey = `imageTexture${inputImage === "two" ? "Two" : ""}`
      updateVarValue(varKey, image)
    } catch (error) {
      console.error('Failed to save canvas as image:', error)
      // TODO: Show error notification to user
    }
  }, [exportCanvasAsImage, updateVarValue])

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
                    values={varValues}
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
                ref={imageSceneRef}
                dimensions={aspectRatio.toArray()}
                inputVars={varValues}
                shader={shader}
                hasImage={hasImage}
                onSaveImage={handleSaveImage}
              />
              <AspectRatioPicker 
                value={aspectRatio}
                onChange={setAspectRatio}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}