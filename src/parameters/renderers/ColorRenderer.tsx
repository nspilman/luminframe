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
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">
          {param.label}
        </label>
        <ColorPicker
          color={value}
          setColor={onChange}
        />
      </div>
    );
  }
}
