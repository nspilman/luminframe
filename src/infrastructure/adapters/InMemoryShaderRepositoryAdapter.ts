import { ShaderRepositoryPort } from '@/application/ports/ShaderRepositoryPort';
import { EffectKey, ShaderEffect } from '@/types/shader';
import { shaderLibrary } from '@/lib/shaders';

/**
 * In-memory implementation of ShaderRepositoryPort: the builtin library plus
 * any custom effects registered at runtime (loaded from the signed-in user's
 * com.luminframe.effect records, keyed by AT-URI).
 *
 * This adapter isolates shader storage specifics from the application layer.
 */
export class InMemoryShaderRepositoryAdapter implements ShaderRepositoryPort {
  private readonly shaders: Record<EffectKey, ShaderEffect>;

  constructor() {
    this.shaders = { ...shaderLibrary };
  }

  /**
   * Register a runtime-loaded effect under its key. Overwrites are deliberate:
   * re-fetching after a republish updates the effect in place.
   */
  register(key: EffectKey, effect: ShaderEffect): void {
    this.shaders[key] = effect;
  }

  /**
   * Get a specific shader effect by key
   */
  getShader(name: EffectKey): ShaderEffect {
    const shader = this.shaders[name];

    if (!shader) {
      throw new Error(
        `Shader '${name}' not found. Available shaders: ${this.getAvailableTypes().join(', ')}`
      );
    }

    return shader;
  }

  /**
   * Get a list of all available effect keys
   */
  getAvailableTypes(): EffectKey[] {
    return Object.keys(this.shaders);
  }
}
