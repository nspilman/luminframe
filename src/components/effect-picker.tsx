'use client'

import { registeredShaders, ShaderType } from '@/types/shader'
import { Button } from './ui/button'

type EffectPickerProps = {
  selectedShader: ShaderType
  onShaderSelect: (shader: ShaderType) => void
}

export function EffectPicker({ selectedShader, onShaderSelect }: EffectPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {registeredShaders.map((effect) => (
        <Button
          key={effect}
          variant={selectedShader === effect ? "default" : "outline"}
          onClick={() => onShaderSelect(effect)}
          className="capitalize"
        >
          {effect}
        </Button>
      ))}
    </div>
  )
} 