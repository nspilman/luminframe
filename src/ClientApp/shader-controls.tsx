'use client'

import { Button } from "@/components/ui/button"
import { shaderEffects } from "@/hooks/useShader"
import { registeredShaders, ShaderType } from "@/types/shader"

interface ShaderControlsProps {
  selectedShader: ShaderType
  onShaderSelect: (shader: ShaderType) => void
}

export function ShaderControls({ selectedShader, onShaderSelect }: ShaderControlsProps) {
  return (
    <div className="flex gap-2">
      {
        registeredShaders.map(shader => (
        <Button
          key={shader}
          variant={shader === selectedShader ? 'default' : 'outline'}
          onClick={() => onShaderSelect(shader)}
          className="font-medium"
        >
          {shaderEffects[shader].name}
        </Button>
        ))
      }
    </div>
  )
} 