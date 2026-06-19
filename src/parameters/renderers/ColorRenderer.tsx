import { ParameterRenderer } from '../types';
import { ShaderInputDefinition } from '@/types/shader';
import { Color } from '@/domain/value-objects/Color';
import { ColorPicker } from '@/components/ColorPicker';

/**
 * Renderer for color parameters
 */
export class ColorRenderer implements ParameterRenderer<Color> {
  canRender(param: ShaderInputDefinition): boolean {
    return param.type === 'color';
  }

  render(
    param: ShaderInputDefinition,
    value: Color,
    onChange: (value: Color) => void
  ) {
    let currentValue = value;

    // Convert array to Color instance if needed
    if (Array.isArray(currentValue)) {
      currentValue = Color.fromFloat32Array(currentValue);
    }

    // Ensure we have a valid Color instance
    if (!(currentValue instanceof Color)) {
      console.error('ColorRenderer received non-Color value:', currentValue);
      currentValue = Color.BLACK; // Fallback to black
    }

    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">
          {param.label}
        </label>
        <ColorPicker
          color={currentValue}
          setColor={onChange}
        />
      </div>
    );
  }
}
