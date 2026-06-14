import { ApplyShaderEffectUseCase } from './ApplyShaderEffectUseCase';
import { RenderingPort } from '@/application/ports/RenderingPort';
import { ShaderRepositoryPort } from '@/application/ports/ShaderRepositoryPort';
import { Image } from '@/domain/models/Image';
import { Dimensions } from '@/domain/value-objects/Dimensions';
import { ShaderEffect, ShaderInputVars, ShaderType } from '@/types/shader';

const effect: ShaderEffect = {
  name: 'Fake Effect',
  declarationVars: { resolution: 'vec2' },
  defaultValues: {},
  inputs: {},
  getBody: () => 'void main() {}',
};

/**
 * Hand-written fakes (not mock-framework theater). They record what the use case
 * hands down so we can assert the orchestration contract directly.
 */
class FakeRepository implements ShaderRepositoryPort {
  requestedType: ShaderType | null = null;

  getShader(name: ShaderType): ShaderEffect {
    this.requestedType = name;
    return effect;
  }
  getAllShaders(): Record<ShaderType, ShaderEffect> {
    return {} as Record<ShaderType, ShaderEffect>;
  }
  getAvailableTypes(): ShaderType[] {
    return ['tint', 'vignette'] as ShaderType[];
  }
  hasShader(): boolean {
    return true;
  }
  getShaderMetadata(): any {
    return { name: effect.name, displayName: effect.name, parameterCount: 0 };
  }
}

class FakeRenderingPort implements RenderingPort {
  lastCall: { image: Image; effect: ShaderEffect; params: ShaderInputVars } | null =
    null;

  renderScene(image: Image, e: ShaderEffect, params: ShaderInputVars): void {
    this.lastCall = { image, effect: e, params };
  }
  exportCanvas(): Promise<Blob> {
    return Promise.resolve(new Blob());
  }
  getCanvas(): HTMLCanvasElement | null {
    return null;
  }
  updateDimensions(): void {}
  dispose(): void {}
}

const makeImage = () => new Image('img-1', new Dimensions(4, 2), { url: 'blob:test' });

describe('ApplyShaderEffectUseCase', () => {
  describe('execute', () => {
    it('renders the shader resolved from the repository for the requested type', () => {
      const repo = new FakeRepository();
      const rendering = new FakeRenderingPort();
      const useCase = new ApplyShaderEffectUseCase(rendering, repo);
      const image = makeImage();

      useCase.execute(image, 'tint' as ShaderType, { imageTexture: image });

      expect(repo.requestedType).toBe('tint');
      expect(rendering.lastCall?.effect).toBe(effect);
      expect(rendering.lastCall?.image).toBe(image);
    });

    it('injects the image as imageTexture when params omit it', () => {
      const rendering = new FakeRenderingPort();
      const useCase = new ApplyShaderEffectUseCase(rendering, new FakeRepository());
      const image = makeImage();

      useCase.execute(image, 'tint' as ShaderType, {});

      expect(rendering.lastCall?.params.imageTexture).toBe(image);
    });

    it('keeps an explicitly provided imageTexture', () => {
      const rendering = new FakeRenderingPort();
      const useCase = new ApplyShaderEffectUseCase(rendering, new FakeRepository());
      const source = makeImage();
      const explicit = new Image('img-2', new Dimensions(8, 8), { url: 'blob:other' });

      useCase.execute(source, 'tint' as ShaderType, { imageTexture: explicit });

      expect(rendering.lastCall?.params.imageTexture).toBe(explicit);
    });
  });

  describe('getAvailableShaders', () => {
    it('returns the available types from the repository', () => {
      const useCase = new ApplyShaderEffectUseCase(
        new FakeRenderingPort(),
        new FakeRepository()
      );

      expect(useCase.getAvailableShaders()).toEqual(['tint', 'vignette']);
    });
  });
});
