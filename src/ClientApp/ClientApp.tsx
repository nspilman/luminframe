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

export function ClientApp(): JSX.Element {
  const [selectedShader, setSelectedShader] = useState<ShaderType>("lightThresholdSwap")
  const { shader, varValues, updateVarValue, effect } = useShader(selectedShader)

  const imageTexture = "imageTexture" in varValues ? varValues.imageTexture : null

  const [aspectRatio, setAspectRatio] = useState<[width: number, height: number]>([1,1])

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#030305]">
      {/* Left Sidebar */}
      <div className="md:w-[320px] border-b md:border-b-0 md:border-r border-zinc-800/50 bg-black/20 backdrop-blur-xl">
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
            Luminframe
          </h2>
          
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
      <div className="flex-1 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900 via-black to-zinc-950">
        <div className="p-4 md:p-8 h-[50vh] md:h-full">
          <div className="relative h-full rounded-xl border border-zinc-800/50 bg-black/20 backdrop-blur-sm shadow-2xl overflow-hidden">
            <ImageScene 
              dimensions={aspectRatio}
              inputVars={varValues}
              shader={shader}
            />
            {!imageTexture && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="text-center space-y-2">
                  <Upload className="w-10 h-10 mx-auto text-zinc-500" />
                  <p className="text-lg text-zinc-400">Drop an image to begin editing</p>
                </div>
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
  )
}