import { ParameterRenderer } from '../types';
import { ShaderInputDefinition } from '@/types/shader';
import { Slider } from '@/components/ui/slider';

// A slider's step declares its precision: step 1 is an integer knob, step 0.001
// resolves to thousandths. Formatting to the step's decimal count shows the user
// the value they can actually reach — no false "382.50" on an integer parameter.
function decimalsForStep(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 2;
  const text = String(step);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

/**
 * Renderer for range (slider) parameters
 */
export class RangeRenderer implements ParameterRenderer<number> {
  canRender(param: ShaderInputDefinition): boolean {
    return param.type === 'range';
  }

  render(
    param: ShaderInputDefinition,
    value: number,
    onChange: (value: number) => void
  ) {
    // The registry only routes 'range' descriptors here; the guard narrows the
    // union so min/max/step are reachable without a cast.
    if (param.type !== 'range') return null;
    const decimals = decimalsForStep(param.step);

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium">{param.label}</label>
          <span className="text-sm text-muted-foreground tabular-nums">
            {value.toFixed(decimals)}
          </span>
        </div>
        <Slider
          min={param.min}
          max={param.max}
          step={param.step}
          value={[value]}
          onValueChange={([v]) => onChange(v)}
        />
        <div className="flex justify-between text-xs text-muted-foreground/60 tabular-nums">
          <span>{param.min.toFixed(decimals)}</span>
          <span>{param.max.toFixed(decimals)}</span>
        </div>
      </div>
    );
  }
}
