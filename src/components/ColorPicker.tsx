'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Color } from '@/domain/value-objects/Color'

interface ColorPickerProps {
  color: Color
  setColor: (color: Color) => void
}

export function ColorPicker({ color, setColor }: ColorPickerProps) {
  const rgb = color.toRGBObject();

  return (
    <div className="w-full max-w-xs mx-auto p-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="color-picker">Color</Label>
        <Input
          id="color-picker"
          type="color"
          value={color.toHex()}
          onChange={(e) => setColor(Color.fromHex(e.target.value))}
          className="w-full h-10"
        />
      </div>
      <div className="text-sm text-muted-foreground">
        RGB: [{rgb.r.toFixed(3)}, {rgb.g.toFixed(3)}, {rgb.b.toFixed(3)}]
      </div>
    </div>
  )
}
