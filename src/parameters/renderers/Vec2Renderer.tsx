import { ParameterRenderer, ParameterDefinition } from '../types';
import { Vec2ParameterDefinition } from '../types/Vec2Parameter';
import { Slider } from '@/components/ui/slider';

/**
 * Renderer for vec2 parameters
 */
export class Vec2Renderer implements ParameterRenderer<[number, number]> {
  canRender(param: ParameterDefinition): boolean {
    return param.type === 'vec2';
  }

  render(
    param: ParameterDefinition<[number, number]>,
    value: [number, number],
    onChange: (value: [number, number]) => void
  ) {
    const vec2Param = param as Vec2ParameterDefinition;
    const currentValue = value ?? param.defaultValue;
    const [x, y] = currentValue;
    const labels = vec2Param.labels ?? ['X', 'Y'];
    const [minX, minY] = vec2Param.min ?? [0, 0];
    const [maxX, maxY] = vec2Param.max ?? [100, 100];
    const [stepX, stepY] = vec2Param.step ?? [1, 1];

    return (
      <div className="space-y-4">
        <label className="text-sm font-medium text-zinc-400">
          {param.label}
        </label>

        {/* X Component */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{labels[0]}</span>
            <span className="text-xs text-zinc-500">{x.toFixed(2)}</span>
          </div>
          <Slider
            min={minX}
            max={maxX}
            step={stepX}
            value={[x]}
            onValueChange={([newX]) => onChange([newX, y])}
          />
        </div>

        {/* Y Component */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{labels[1]}</span>
            <span className="text-xs text-zinc-500">{y.toFixed(2)}</span>
          </div>
          <Slider
            min={minY}
            max={maxY}
            step={stepY}
            value={[y]}
            onValueChange={([newY]) => onChange([x, newY])}
          />
        </div>
      </div>
    );
  }
}
