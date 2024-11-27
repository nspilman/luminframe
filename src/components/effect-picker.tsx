'use client'

import { registeredShaders, ShaderType } from '@/types/shader'
import { Button } from './ui/button'
import { Wand2, Grid, SplitSquareHorizontal, Circle, Waves, Flower2, Zap, Sparkles, Cloud, PaintBucket, ImagePlus, Move, PaintBucketIcon, Lightbulb } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { shaderLibrary } from '@/lib/shaders'

const shaderIcons: Record<ShaderType, React.ReactNode> = {
  tint: <Wand2 className="h-6 w-6" />,
  pixelateEffect: <Grid className="h-6 w-6" />,
  rgbSplit: <SplitSquareHorizontal className="h-6 w-6" />,
  vignette: <Circle className="h-6 w-6" />,
  wave: <Waves className="h-6 w-6" />,
  kaleidoscopeEffect: <Flower2 className="h-6 w-6" />,
  glitch: <Zap className="h-6 w-6" />,
  neonGlowEffect: <Sparkles className="h-6 w-6" />,
  dream: <Cloud className="h-6 w-6" />,
  blend: <PaintBucket className='h-6 w-6'/>,
  lightThresholdSwap: <ImagePlus className='h-6 w-6'/>,
  gaussianBlur: <Move className='h-6 w-6'/>,
  hueSwap: <PaintBucketIcon className='h-6 w6'/>,
  blackAndWhite: <Lightbulb className="h-6 w-6"/>
}

type EffectPickerProps = {
  selectedShader: ShaderType
  onShaderSelect: (shader: ShaderType) => void
}

export function EffectPicker({ selectedShader, onShaderSelect }: EffectPickerProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-zinc-400">Effects</h3>
      <Card className="border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm">
        <CardContent className="p-3">
          <div className="max-h-[280px] overflow-y-auto space-y-1">
            {registeredShaders.map((shader) => (
              <Button
                key={shader}
                variant={selectedShader === shader ? "default" : "ghost"}
                className={`w-full justify-start gap-2 h-9 px-2 ${
                  selectedShader === shader 
                    ? 'bg-violet-600 hover:bg-violet-700 text-white' 
                    : 'hover:bg-white/5 text-zinc-400'
                }`}
                onClick={() => onShaderSelect(shader)}
              >
                {shaderIcons[shader]}
                <span className="capitalize text-sm">{
                shaderLibrary[shader].name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 