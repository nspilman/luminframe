'use client'

import { ShaderEffect, ShaderInputDefinition, ShaderInputVars } from '@/types/shader'
import { ImageUpload } from './image-upload'
import { ColorPicker } from '@/components/ColorPicker'
import { Image } from '@/domain/models/Image'
import { Color } from '@/domain/value-objects/Color'
import { Label } from "@/components/ui/label"
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'

type ShaderControlsProps = {
effect: ShaderEffect,
values: ShaderInputVars,
  onChange: (key: keyof ShaderInputVars, value: ShaderInputVars[string]) => void
}

export function ShaderControls({ effect, values, onChange }: ShaderControlsProps) {
  return (
    <div className="space-y-6">
      {Object.entries(effect.inputs).map(([key, input]) => (
        <div key={key} className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-zinc-400" htmlFor={input.label}>
              {input.label}
            </Label>
            {typeof values[key] === 'number' && (
              <span className="text-xs text-zinc-500">
                {(values[key] as number)?.toFixed(2)}
              </span>
            )}
          </div>
          
          {input.type === 'image' ? (
            <ImageUpload
              onChange={(image) => onChange(key, image)}
              hasImage={Boolean(values[key] instanceof Image)}
            />
          ) : input.type === 'vec3' ? (
            <ColorPicker
              setColor={(color) => onChange(key, color)}
              color={
                values[key] instanceof Color
                  ? (values[key] as Color)
                  : Color.fromFloat32Array(effect.defaultValues[key] as Float32Array)
              }
            />
          ) : input.type === 'boolean' ? (
            <Switch
              id={input.label}
              checked={values[key] as boolean}
              onCheckedChange={(checked) => onChange(key, checked)}
              className="data-[state=checked]:bg-violet-600"
            />
          ) : (
            <Slider
              min={input.min}
              max={input.max}
              step={input.step}
              value={[values[key] as number]}
              onValueChange={([value]) => onChange(key, value)}
              className="[&_[role=slider]]:bg-violet-500 [&_[role=slider]]:border-violet-600"
            />
          )}
        </div>
      ))}
    </div>
  )
} 