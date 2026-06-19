import { ParameterRenderer } from '../types';
import { ShaderInputDefinition } from '@/types/shader';
import { Slider } from '@/components/ui/slider';

/**
 * Renderer for vec2 parameters
 */
export class Vec2Renderer implements ParameterRenderer<[number, number]> {
  canRender(param: ShaderInputDefinition): boolean {
    return param.type === 'vec2';
  }

  render(
    param: ShaderInputDefinition,
    value: [number, number],
    onChange: (value: [number, number]) => void
  ) {
    // The registry only routes 'vec2' descriptors here; the guard narrows the
    // union so the per-axis bounds/labels are reachable without a cast.
    if (param.type !== 'vec2') return null;
    const [x, y] = value;
    const labels = param.labels ?? ['X', 'Y'];
    const [minX, minY] = param.min ?? [0, 0];
    const [maxX, maxY] = param.max ?? [100, 100];
    const [stepX, stepY] = param.step ?? [1, 1];

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
