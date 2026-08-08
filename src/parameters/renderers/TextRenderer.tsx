import { ParameterRenderer } from '../types';
import { ShaderInputDefinition } from '@/types/shader';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/**
 * Renderer for text parameters — the string that gets rasterized into glyphs.
 *
 * A textarea rather than an input because newlines are meaningful: the
 * rasterizer breaks on them and centres the block, so a two-line caption is
 * typed the way it reads.
 */
export class TextRenderer implements ParameterRenderer<string> {
  canRender(param: ShaderInputDefinition): boolean {
    return param.type === 'text';
  }

  render(
    param: ShaderInputDefinition,
    value: string,
    onChange: (value: string) => void
  ) {
    return (
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-zinc-400">
          {param.label}
        </Label>
        <Textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={param.type === 'text' ? param.placeholder : undefined}
          rows={2}
          className="resize-y"
        />
      </div>
    );
  }
}
