import { RenderEditUseCase } from './RenderEditUseCase';
import { RenderingPort, RenderPass } from '@/application/ports/RenderingPort';
import { ShaderRepositoryPort } from '@/application/ports/ShaderRepositoryPort';
import { EditPipeline } from '@/domain/models/EditPipeline';
import { Image, ImageData } from '@/domain/models/Image';
import { Dimensions } from '@/domain/value-objects/Dimensions';
import { ShaderEffect, ShaderType } from '@/types/shader';

/** A distinct effect per type so the assembled pass list can be identified. */
function effectFor(type: ShaderType): ShaderEffect {
  return {
    name: `effect:${type}`,
    declarationVars: { resolution: 'vec2' },
    defaultValues: {},
    inputs: {},
    getBody: () => 'void main() {}',
  };
}

class FakeRepository implements ShaderRepositoryPort {
  getShader(type: ShaderType): ShaderEffect {
    return effectFor(type);
  }
  getAvailableTypes(): ShaderType[] {
    return [];
  }
}

/** Records each renderChain call so the assembled pipeline can be asserted. */
class RecordingRenderingPort implements RenderingPort {
  calls: { source: Image; passes: ReadonlyArray<RenderPass>; resolution: [number, number] }[] = [];

  renderChain(
    source: Image,
    passes: ReadonlyArray<RenderPass>,
    resolution: [number, number]
  ): void {
    this.calls.push({ source, passes, resolution });
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

const makeSource = () =>
  new Image('source', new Dimensions(4, 2), { url: 'blob:source' } as ImageData);

function makeUseCase(rendering: RecordingRenderingPort) {
  return new RenderEditUseCase(new FakeRepository(), rendering);
}

describe('RenderEditUseCase', () => {
  describe('execute', () => {
    it('renders nothing when the pipeline has no source', () => {
      const rendering = new RecordingRenderingPort();
      makeUseCase(rendering).execute(
        EditPipeline.empty(),
        { type: 'colorTint' as ShaderType, params: {} },
        [4, 2]
      );

      expect(rendering.calls).toHaveLength(0);
    });

    it('renders the draft as a single-pass chain on the source', () => {
      const rendering = new RecordingRenderingPort();
      const source = makeSource();
      const pipeline = EditPipeline.empty().withSource(source);

      makeUseCase(rendering).execute(
        pipeline,
        { type: 'colorTint' as ShaderType, params: { strength: 0.5 } },
        [4, 2]
      );

      expect(rendering.calls).toHaveLength(1);
      const { source: chainSource, passes, resolution } = rendering.calls[0];
      expect(chainSource).toBe(source);
      expect(resolution).toEqual([4, 2]);
      expect(passes).toHaveLength(1);
      expect(passes[0].effect.name).toBe('effect:colorTint');
      expect(passes[0].params).toEqual({ strength: 0.5 });
    });

    it('assembles committed effects before the draft, in order', () => {
      const rendering = new RecordingRenderingPort();
      const source = makeSource();
      const pipeline = EditPipeline.empty()
        .withSource(source)
        .append('colorTint' as ShaderType, { strength: 1 })
        .append('vignette' as ShaderType, { radius: 0.8 });

      makeUseCase(rendering).execute(
        pipeline,
        { type: 'pixelate' as ShaderType, params: { size: 4 } },
        [4, 2]
      );

      expect(rendering.calls).toHaveLength(1);
      const { passes } = rendering.calls[0];
      // Two committed effects fold first, then the live draft on top.
      expect(passes.map((p) => p.effect.name)).toEqual([
        'effect:colorTint',
        'effect:vignette',
        'effect:pixelate',
      ]);
      expect(passes.map((p) => p.params)).toEqual([
        { strength: 1 },
        { radius: 0.8 },
        { size: 4 },
      ]);
    });
  });
});
