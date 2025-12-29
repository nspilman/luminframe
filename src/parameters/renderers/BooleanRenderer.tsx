import { ParameterRenderer, ParameterDefinition } from '../types';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

/**
 * Renderer for boolean parameters
 */
export class BooleanRenderer implements ParameterRenderer<boolean> {
  canRender(param: ParameterDefinition): boolean {
    return param.type === 'boolean';
  }

  render(
    param: ParameterDefinition<boolean>,
    value: boolean,
    onChange: (value: boolean) => void
  ) {
    const currentValue = value ?? param.defaultValue;

    return (
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-zinc-400">
          {param.label}
        </Label>
        <Switch
          checked={currentValue}
          onCheckedChange={onChange}
          className="data-[state=checked]:bg-violet-600"
        />
      </div>
    );
  }
}
