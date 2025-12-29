import { ParameterRenderer, ParameterDefinition } from '../types';
import { RangeParameterDefinition } from '../types/RangeParameter';
import { Slider } from '@/components/ui/slider';

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

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium">{param.label}</label>
          <span className="text-sm text-muted-foreground">
            {currentValue.toFixed(2)}
          </span>
        </div>
        <Slider
          min={rangeParam.min}
          max={rangeParam.max}
          step={rangeParam.step}
          value={[currentValue]}
          onValueChange={([v]) => onChange(v)}
        />
      </div>
    );
  }
}
