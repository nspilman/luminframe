import { ParameterRenderer } from '../types';
import { ShaderInputDefinition } from '@/types/shader';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

/**
 * Renderer for boolean parameters
 */
export class BooleanRenderer implements ParameterRenderer<boolean> {
  canRender(param: ShaderInputDefinition): boolean {
    return param.type === 'boolean';
  }

  render(
    param: ShaderInputDefinition,
    value: boolean,
    onChange: (value: boolean) => void
  ) {
    return (
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-zinc-400">
          {param.label}
        </Label>
        <Switch
          checked={value}
          onCheckedChange={onChange}
          className="data-[state=checked]:bg-violet-600"
        />
      </div>
    );
  }
}
