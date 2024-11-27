'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ColorPickerProps {
  color: Float32Array
  setColor: (color: Float32Array) => void
}

export function ColorPicker({ color, setColor }: ColorPickerProps) {
  // Convert RGB float values to hex for the color input
  const rgbToHex = (rgb: Float32Array): string => {
    const r = Math.round(rgb[0] * 255).toString(16).padStart(2, '0')
    const g = Math.round(rgb[1] * 255).toString(16).padStart(2, '0')
    const b = Math.round(rgb[2] * 255).toString(16).padStart(2, '0')
    return `#${r}${g}${b}`
  }

  // Convert hex to RGB float values
  const hexToRgb = (hex: string): Float32Array => {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    return new Float32Array([r, g, b])
  }

  return (
    <div className="w-full max-w-xs mx-auto p-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="color-picker">Color</Label>
        <Input
          id="color-picker"
          type="color"
          value={rgbToHex(color)}
          onChange={(e) => setColor(hexToRgb(e.target.value))}
          className="w-full h-10"
        />
      </div>
      <div className="text-sm text-muted-foreground">
        RGB: [{color[0].toFixed(3)}, {color[1].toFixed(3)}, {color[2].toFixed(3)}]
      </div>
    </div>
  )
}