'use client'

import { useState } from 'react'
import { ImageScene } from '../ImageScene'
import { useShader } from '@/hooks/useShader'
import { ShaderType } from '@/types/shader'
import { ShaderControls } from './shader-controls'
import { EffectPicker } from '@/components/effect-picker'
import { Card, CardContent } from '@/components/ui/card'
import { Upload } from 'lucide-react'
import { AspectRatioPicker } from '@/components/aspect-ratio-picker'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'
import { TextureLoader } from 'three'
import { HeaderBar } from '@/components/header-bar'

export function ClientApp(): JSX.Element {
  const [selectedShader, setSelectedShader] = useState<ShaderType>("lightThresholdSwap")
  const { shader, varValues, updateVarValue, effect } = useShader(selectedShader)

  const imageTexture = "imageTexture" in varValues ? varValues.imageTexture : null

  const [aspectRatio, setAspectRatio] = useState<[width: number, height: number]>([1,1])

  const handleSaveImage = async (inputImage: "one" | "two" = "one") => {
    // Get the canvas element from the ImageScene
    const canvas = document.querySelector('canvas')
    if (!canvas) return

    // Convert the canvas to a data URL
    const dataURL = canvas.toDataURL('image/png')
    
    // Create a temporary image to load the data URL
    const img = new Image()
    img.src = dataURL
    
    // Create a new texture from the image
    const textureLoader = new TextureLoader()
    const texture = textureLoader.load(img.src)
    const varKey = `imageTexture${inputImage === "two" ? "Two" : ""}`
    console.log({texture, varKey})
    // Update the imageTexture value
    updateVarValue(varKey, texture)
  }

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
              <div className="relative h-full rounded-xl border border-zinc-800/50 bg-black/20 backdrop-blur-sm shadow-2xl overflow-hidden">
                <div className="absolute inset-0">
                  <ImageScene 
                    dimensions={aspectRatio}
                    inputVars={varValues}
                    shader={shader}
                  />
                </div>
                {!imageTexture ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="text-center space-y-2">
                      <Upload className="w-10 h-10 mx-auto text-zinc-500" />
                      <p className="text-lg text-zinc-400">Drop an image to begin editing</p>
                    </div>
                  </div>
                ) : (
                  <div className="absolute top-4 right-4">
                    <Button
                      onClick={() => handleSaveImage()}
                      variant="secondary"
                      className="bg-zinc-900/50 hover:bg-zinc-900/70"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save as Input
                    </Button>
                    <Button
                     onClick={() => handleSaveImage("two")}
                     variant="secondary"
                     className="bg-zinc-900/50 hover:bg-zinc-900/70"
                   >
                     <Save className="w-4 h-4 mr-2" />
                     Save as Second Input
                   </Button>
                  </div>              
                )}
              </div>
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