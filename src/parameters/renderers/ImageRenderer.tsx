import { ParameterRenderer } from '../types';
import { ShaderInputDefinition } from '@/types/shader';
import { Image } from '@/domain/models/Image';
import { ImageUpload } from '@/ClientApp/image-upload';

/**
 * Renderer for image parameters
 */
export class ImageRenderer implements ParameterRenderer<Image | null> {
  canRender(param: ShaderInputDefinition): boolean {
    return param.type === 'image';
  }

  render(
    param: ShaderInputDefinition,
    value: Image | null,
    onChange: (value: Image | null) => void
  ) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">
          {param.label}
        </label>
        <ImageUpload
          onChange={onChange}
          hasImage={value instanceof Image}
        />
      </div>
    );
  }
}
