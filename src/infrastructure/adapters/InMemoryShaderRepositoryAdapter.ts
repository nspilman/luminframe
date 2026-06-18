import { ShaderRepositoryPort } from '@/application/ports/ShaderRepositoryPort';
import { ShaderEffect, ShaderType } from '@/types/shader';
import { shaderLibrary } from '@/lib/shaders';

/**
 * In-memory implementation of ShaderRepositoryPort.
 * Wraps the existing shader library and provides access through the port interface.
 *
 * This adapter isolates shader storage specifics from the application layer.
 * In the future, could be swapped with a database-backed or API-based implementation.
 */
export class InMemoryShaderRepositoryAdapter implements ShaderRepositoryPort {
  private readonly shaders: Record<ShaderType, ShaderEffect>;

  constructor() {
    // Load all shaders from the library
    this.shaders = { ...shaderLibrary };
  }

  /**
   * Get a specific shader effect by type
   */
  getShader(name: ShaderType): ShaderEffect {
    const shader = this.shaders[name];

    if (!shader) {
      throw new Error(
        `Shader '${name}' not found. Available shaders: ${this.getAvailableTypes().join(', ')}`
      );
    }

    return shader;
  }

  /**
   * Get a list of all available shader types
   */
  getAvailableTypes(): ShaderType[] {
    return Object.keys(this.shaders) as ShaderType[];
  }
}
