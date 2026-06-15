'use client'

import { registeredShaders, ShaderType } from '@/types/shader'
import { Button } from './ui/button'
import { Wand2, Grid, SplitSquareHorizontal, Circle, Waves, Flower2, Zap, Sparkles, Cloud, PaintBucket, ImagePlus, Move, Palette, Contrast, Lightbulb, PaintRollerIcon } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { shaderLibrary } from '@/lib/shaders'
import { Image } from '@/domain/models/Image'
import { useEffectThumbnails } from '@/hooks/useEffectThumbnails'

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
  hueSwap: <Palette className="h-6 w-6"/>,
  blackAndWhite: <Contrast className="h-6 w-6"/>,
  colorQuantize: <PaintRollerIcon className="h-6 w-6"/>,
  luminanceQuantize: <Lightbulb className="h-6 w-6"/>
}

type EffectPickerProps = {
  selectedShader: ShaderType
  onShaderSelect: (shader: ShaderType) => void
  source: Image | null
}

export function EffectPicker({ selectedShader, onShaderSelect, source }: EffectPickerProps) {
  const thumbnails = useEffectThumbnails(source)

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-zinc-400">Effects</h3>
      <Card className="border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm">
        <CardContent className="p-3">
          <div className="max-h-[280px] overflow-y-auto space-y-1">
            {registeredShaders.map((shader) => {
              const thumb = thumbnails?.[shader]
              const isSelected = selectedShader === shader
              return (
                <Button
                  key={shader}
                  variant={isSelected ? "default" : "ghost"}
                  className={`w-full justify-start gap-3 h-12 px-2 ${
                    isSelected
                      ? 'bg-violet-600 hover:bg-violet-700 text-white'
                      : 'hover:bg-white/5 text-zinc-400'
                  }`}
                  onClick={() => onShaderSelect(shader)}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-black/30 ring-1 ring-white/10">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      shaderIcons[shader]
                    )}
                  </span>
                  <span className="capitalize text-sm">{shaderLibrary[shader].name}</span>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}