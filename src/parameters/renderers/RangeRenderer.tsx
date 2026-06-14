import { ParameterRenderer, ParameterDefinition } from '../types';
import { RangeParameterDefinition } from '../types/RangeParameter';
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
  canRender(param: ParameterDefinition): boolean {
    return param.type === 'range';
  }

  render(
    param: ParameterDefinition<number>,
    value: number,
    onChange: (value: number) => void
  ) {
    const rangeParam = param as RangeParameterDefinition;
    const currentValue = value ?? param.defaultValue;
    const decimals = decimalsForStep(rangeParam.step);

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium">{param.label}</label>
          <span className="text-sm text-muted-foreground tabular-nums">
            {currentValue.toFixed(decimals)}
          </span>
        </div>
        <Slider
          min={rangeParam.min}
          max={rangeParam.max}
          step={rangeParam.step}
          value={[currentValue]}
          onValueChange={([v]) => onChange(v)}
        />
        <div className="flex justify-between text-xs text-muted-foreground/60 tabular-nums">
          <span>{rangeParam.min.toFixed(decimals)}</span>
          <span>{rangeParam.max.toFixed(decimals)}</span>
        </div>
      </div>
    );
  }
}
