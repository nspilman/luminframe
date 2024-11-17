'use client'

import { Button } from "@/components/ui/button"

interface ShaderControlsProps {
  selectedShader: string
  onShaderSelect: (shader: string) => void
}

export function ShaderControls({ selectedShader, onShaderSelect }: ShaderControlsProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant={selectedShader === 'fragment' ? 'default' : 'outline'}
        onClick={() => onShaderSelect('fragment')}
        className="font-medium"
      >
        Wave Effect
      </Button>
      <Button
        variant={selectedShader === 'whiteout' ? 'default' : 'outline'}
        onClick={() => onShaderSelect('whiteout')}
        className="font-medium"
      >
        White Out
      </Button>
      <Button
        variant={selectedShader === 'blur' ? 'default' : 'outline'}
        onClick={() => onShaderSelect('blur')}
        className="font-medium"
      >
        Blur
      </Button>
    </div>
  )
} 