'use client'

import { ShaderEffect, ShaderInputVars } from '@/types/shader'
import { useParameterRegistry } from '@/parameters'

type ShaderControlsProps = {
  effect: ShaderEffect,
  values: ShaderInputVars,
  onChange: (key: keyof ShaderInputVars, value: ShaderInputVars[string]) => void
}

export function ShaderControls({ effect, values, onChange }: ShaderControlsProps) {
  const paramRegistry = useParameterRegistry();

  return (
    <div className="space-y-6">
      {Object.entries(effect.inputs).map(([key, input]) => {
        // The input descriptor is what the renderer consumes directly — no
        // bridging type. Pick the control by its type, seed it with the live
        // value (falling back to the effect's default when the key is unset).
        const renderer = paramRegistry.getRenderer(input);

        if (!renderer) {
          console.warn(`No renderer found for parameter type: ${input.type}`);
          return null;
        }

        const value = values[key] ?? effect.defaultValues[key];

        return (
          <div key={key}>
            {renderer.render(input, value, (v) => onChange(key, v))}
          </div>
        );
      })}
    </div>
  );
}