'use client'

import { useState } from 'react'
import { registeredShaders, ShaderType } from '@/types/shader'
import { Button } from './ui/button'
import { Wand2, Grid, SplitSquareHorizontal, Circle, Waves, Flower2, Zap, Sparkles, Cloud, PaintBucket } from 'lucide-react'

const shaderIcons: Record<ShaderType, React.ReactNode> = {
  test: <Wand2 className="h-6 w-6" />,
  pixelateEffect: <Grid className="h-6 w-6" />,
  rgbSplit: <SplitSquareHorizontal className="h-6 w-6" />,
  vignette: <Circle className="h-6 w-6" />,
  wave: <Waves className="h-6 w-6" />,
  kaleidoscopeEffect: <Flower2 className="h-6 w-6" />,
  glitch: <Zap className="h-6 w-6" />,
  neonGlowEffect: <Sparkles className="h-6 w-6" />,
  dream: <Cloud className="h-6 w-6" />,
  blend: <PaintBucket className='h-6 w-6'/>
}

type EffectPickerProps = {
  selectedShader: ShaderType
  onShaderSelect: (shader: ShaderType) => void
}

export function EffectPicker({ selectedShader, onShaderSelect }: EffectPickerProps) {
  return (
    <div className="w-full space-y-2">
      <div className="flex items-center">
        <h3 className="text-sm font-medium">Effects</h3>
      </div>
      <div className="max-h-[200px] overflow-y-auto pr-2 space-y-2">
        {registeredShaders.map((shader) => (
          <Button
            key={shader}
            variant={selectedShader === shader ? "default" : "outline"}
            className="w-full h-9 flex items-center justify-start gap-2 px-3"
            onClick={() => onShaderSelect(shader)}
          >
            {shaderIcons[shader]}
            <span className="capitalize">{shader}</span>
          </Button>
        ))}
      </div>
    </div>
  )
} 