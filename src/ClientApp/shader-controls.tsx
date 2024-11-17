'use client'

import { ShaderInputVars, ShaderInputDefinition } from '@/types/shader'

type ShaderControlsProps = {
  inputs: Record<string, ShaderInputDefinition>
  values: ShaderInputVars
  onChange: (key: keyof ShaderInputVars, value: number) => void
}

export function ShaderControls({ inputs, values, onChange }: ShaderControlsProps) {
  return (
    <div className="space-y-4">
      {Object.entries(inputs).map(([key, input]) => (
        <div key={key} className="flex flex-col gap-1">
          <label htmlFor={key} className="text-sm font-medium">
            {input.label}
          </label>
          <input
            type={input.type}
            id={key}
            min={input.min}
            max={input.max}
            step={input.step}
            value={values[key] as number}
            onChange={(e) => onChange(key, parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      ))}
    </div>
  )
} 