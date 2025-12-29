import { ParameterRenderer, ParameterDefinition } from '../types';
import { Image } from '@/domain/models/Image';
import { ImageUpload } from '@/ClientApp/image-upload';

/**
 * Renderer for image parameters
 */
export class ImageRenderer implements ParameterRenderer<Image | null> {
  canRender(param: ParameterDefinition): boolean {
    return param.type === 'image';
  }

  render(
    param: ParameterDefinition<Image | null>,
    value: Image | null,
    onChange: (value: Image | null) => void
  ) {
    const currentValue = value ?? param.defaultValue;

    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">
          {param.label}
        </label>
        <ImageUpload
          onChange={onChange}
          hasImage={currentValue instanceof Image}
        />
      </div>
    );
  }
}
