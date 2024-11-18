'use client'

import { useState } from 'react'
import { ImageScene } from '../ImageScene'
import { useShader } from '@/hooks/useShader'
import { ShaderType } from '@/types/shader'
import { ShaderControls } from './shader-controls'
import { EffectPicker } from '@/components/effect-picker'

export function ClientApp(): JSX.Element {
  const [selectedShader, setSelectedShader] = useState<ShaderType>("test")
  const { shader, varValues, updateVarValue, inputs } = useShader(selectedShader)
  const imageDimensions = varValues.resolution
  const imageTexture = "imageTexture" in varValues ? varValues.imageTexture : null

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Left Sidebar with Controls */}
      <div className="w-80 bg-muted p-6 overflow-y-auto space-y-6">
        <h2 className="text-2xl font-space-grotesk font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Image Effects
        </h2>
        
        <EffectPicker selectedShader={selectedShader} onShaderSelect={setSelectedShader} />
        
        <ShaderControls 
          inputs={inputs}
          values={varValues}
          onChange={updateVarValue}
        />
      </div>
      
      {/* Main Content Area with Image */}
      <div className="flex-1 p-8 overflow-auto">
        <div className="relative w-full h-full rounded-2xl shadow-inner overflow-hidden">
          <ImageScene 
            dimensions={imageDimensions}
            inputVars={varValues}
            shader={shader}
          />
          {!imageTexture && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm">
              <p className="text-lg text-muted-foreground">Please upload an image to begin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}