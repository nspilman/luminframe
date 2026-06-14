import { RenderEditUseCase } from './RenderEditUseCase';
import { ApplyShaderEffectUseCase } from './ApplyShaderEffectUseCase';
import { RenderingPort } from '@/application/ports/RenderingPort';
import { ImageExportPort } from '@/application/ports/ImageExportPort';
import { ShaderRepositoryPort } from '@/application/ports/ShaderRepositoryPort';
import { EditPipeline } from '@/domain/models/EditPipeline';
import { Image } from '@/domain/models/Image';
import { Dimensions } from '@/domain/value-objects/Dimensions';
import { ImageData } from '@/domain/models/Image';
import { ImageFormat } from '@/domain/value-objects/ImageFormat';
import { ShaderEffect, ShaderInputVars, ShaderType } from '@/types/shader';

const effect: ShaderEffect = {
  name: 'Fake Effect',
  declarationVars: { resolution: 'vec2' },
  defaultValues: {},
  inputs: {},
  getBody: () => 'void main() {}',
};

class FakeRepository implements ShaderRepositoryPort {
  getShader(): ShaderEffect {
    return effect;
  }
  getAllShaders(): Record<ShaderType, ShaderEffect> {
    return {} as Record<ShaderType, ShaderEffect>;
  }
  getAvailableTypes(): ShaderType[] {
    return [];
  }
  hasShader(): boolean {
    return true;
  }
  getShaderMetadata(): any {
    return { name: effect.name, displayName: effect.name, parameterCount: 0 };
  }
}

/** Records every render pass so the fold's call sequence can be asserted. */
class RecordingRenderingPort implements RenderingPort {
  calls: { image: Image; params: ShaderInputVars }[] = [];

  renderScene(image: Image, _effect: ShaderEffect, params: ShaderInputVars): void {
    this.calls.push({ image, params });
  }
  exportCanvas(): Promise<Blob> {
    return Promise.resolve(new Blob());
  }
  getCanvas(): HTMLCanvasElement | null {
    return {} as HTMLCanvasElement;
  }
  updateDimensions(): void {}
  dispose(): void {}
}

/** canvasToImage returns a fresh, identifiable Image per fold so we can prove
 *  the previous pass's output is what feeds the next pass. */
class FoldingImageExport implements ImageExportPort {
  private count = 0;

  toBlob(): Promise<Blob> {
    return Promise.resolve(new Blob());
  }
  async canvasToImage(): Promise<Image> {
    this.count += 1;
    return new Image(`folded-${this.count}`, new Dimensions(4, 2), {
      url: `blob:folded-${this.count}`,
    });
  }
  download(): void {}
  blobToDataUrl(): Promise<string> {
    return Promise.resolve('');
  }
}

const makeSource = () =>
  new Image('source', new Dimensions(4, 2), { url: 'blob:source' } as ImageData);

function makeUseCase(rendering: RecordingRenderingPort) {
  const apply = new ApplyShaderEffectUseCase(rendering, new FakeRepository());
  return new RenderEditUseCase(apply, rendering, new FoldingImageExport());
}

describe('RenderEditUseCase', () => {
  describe('execute', () => {
    it('renders nothing when the pipeline has no source', async () => {
      const rendering = new RecordingRenderingPort();
      await makeUseCase(rendering).execute(
        EditPipeline.empty(),
        { type: 'tint' as ShaderType, params: {} },
        [4, 2]
      );

      expect(rendering.calls).toHaveLength(0);
    });

    it('renders the draft once on the source when nothing is committed', async () => {
      const rendering = new RecordingRenderingPort();
      const source = makeSource();
      const pipeline = EditPipeline.empty().withSource(source);

      await makeUseCase(rendering).execute(
        pipeline,
        { type: 'tint' as ShaderType, params: { strength: 0.5 } },
        [4, 2]
      );

      expect(rendering.calls).toHaveLength(1);
      expect(rendering.calls[0].image).toBe(source);
      expect(rendering.calls[0].params).toMatchObject({
        strength: 0.5,
        imageTexture: source,
        resolution: [4, 2],
      });
    });

    it('folds each committed effect forward as the next pass input', async () => {
      const rendering = new RecordingRenderingPort();
      const source = makeSource();
      const pipeline = EditPipeline.empty()
        .withSource(source)
        .append('tint' as ShaderType, {});

      await makeUseCase(rendering).execute(
        pipeline,
        { type: 'vignette' as ShaderType, params: {} },
        [4, 2]
      );

      // pass 1: committed effect on the source; pass 2: draft on the folded result
      expect(rendering.calls).toHaveLength(2);
      expect(rendering.calls[0].image).toBe(source);
      expect(rendering.calls[1].image.id).toBe('folded-1');
      expect(rendering.calls[1].params.imageTexture).toBe(rendering.calls[1].image);
    });
  });
});
