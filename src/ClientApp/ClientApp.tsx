'use client'

import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { ImageScene } from '../ImageScene'
import { useShader } from '@/hooks/useShader'
import { ShaderType } from '@/types/shader'
import { ShaderControls } from './shader-controls'
import { EffectPicker } from '@/components/effect-picker'

export function ClientApp(): JSX.Element {
  const [selectedShader, setSelectedShader] = useState<ShaderType>("test")
  const { shader, varValues, updateVarValue, inputs } = useShader(selectedShader)
  const imageDimensions = varValues.resolution
  const imageTexture = "imageTexture" in varValues ? varValues.imageTexture : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F2F8] to-white flex items-center justify-center p-8">
      <Card className="w-full max-w-[1280px] bg-white/80 backdrop-blur-md shadow-[0_4px_6px_-1px_rgba(14,11,61,0.1)] rounded-3xl">
        <CardContent className="p-8">
          <h2 className="text-4xl font-space-grotesk font-bold text-center mb-8 bg-gradient-to-r from-[#0E0B3D] to-[#9D8DF1] bg-clip-text text-transparent">
            Transform Your Image
          </h2>

          <EffectPicker selectedShader={selectedShader} onShaderSelect={setSelectedShader} />
          
          <div className="space-y-4 mb-4">
            <ShaderControls 
              inputs={inputs}
              values={varValues}
              onChange={updateVarValue}
            />
          </div>

          <div className="relative mx-auto overflow-hidden rounded-2xl shadow-inner">
            <ImageScene 
              dimensions={imageDimensions}
              inputVars={varValues}
              shader={shader}
            />
            {!imageTexture && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50 backdrop-blur-sm">
                <p className="text-lg text-gray-500">Please upload an image to begin</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
