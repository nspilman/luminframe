'use client'

import { ShaderInputDefinition, ShaderInputVars } from '@/types/shader'
import { ImageUpload } from './image-upload'
import { ColorPicker } from '@/components/ColorPicker'
import { Texture } from 'three'
import { Switch } from '@/components/ui/switch'

type ShaderControlsProps = {
  inputs: Record<string, ShaderInputDefinition>
  values: ShaderInputVars
  onChange: (key: keyof ShaderInputVars, value: ShaderInputVars[string]) => void
}

export function ShaderControls({ inputs, values, onChange }: ShaderControlsProps) {
  console.log({inputs, values})
  return (
    <div className="space-y-4">
      {Object.entries(inputs).map(([key, input]) => (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-sm font-medium">
            {input.label}
          </label>
          {input.type === 'image' ? (
            <ImageUpload 
              onChange={(texture) => onChange(key, texture)}
              hasImage={Boolean(values[key] instanceof Texture)}
            />
          ) : input.type === 'vec3' ? (
            <ColorPicker
              setColor={(e) => onChange(key, e)}
              color={values[key] as Float32Array}
            />
          ) : input.type === 'boolean' ? (
            <Switch
              checked={true}
              onCheckedChange={(checked) => onChange(key, checked)}
            />
          ) : (
            <input
              type="range"
              min={input.min}
              max={input.max}
              step={input.step}
              value={values[key] as number}
              onChange={(e) => onChange(key, parseFloat(e.target.value))}
              className="w-full"
            />
          )}
        </div>
      ))}
    </div>
  )
} 