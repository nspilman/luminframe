'use client'

import { ShaderEffect, ShaderInputDefinition, ShaderInputVars } from '@/types/shader'
import { useParameterRegistry } from '@/parameters'
import { ParameterDefinition } from '@/parameters/types'

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
        // Effects declare UI input types directly (range, color, vec2, ...),
        // so the descriptor maps straight onto a ParameterDefinition.
        const paramDefinition: ParameterDefinition = {
          ...input,
          defaultValue: effect.defaultValues[key],
        };

        // Get the renderer for this parameter type
        const renderer = paramRegistry.getRenderer(paramDefinition);

        if (!renderer) {
          console.warn(`No renderer found for parameter type: ${input.type}`);
          return null;
        }

        return (
          <div key={key}>
            {renderer.render(
              paramDefinition,
              values[key],
              (value) => onChange(key, value)
            )}
          </div>
        );
      })}
    </div>
  );
} 