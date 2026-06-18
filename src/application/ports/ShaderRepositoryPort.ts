import { ShaderEffect, ShaderType } from '@/types/shader';

/**
 * Port for accessing shader effects.
 * Abstracts away shader storage and retrieval specifics.
 *
 * This is an INPUT port - the application needs this to access shaders.
 */
export interface ShaderRepositoryPort {
  /**
   * Get a specific shader effect by type
   *
   * @param name - The shader type to retrieve
   * @returns The shader effect
   * @throws Error if shader type is not found
   */
  getShader(name: ShaderType): ShaderEffect;

  /**
   * Get a list of all available shader types
   *
   * @returns Array of shader type names
   */
  getAvailableTypes(): ShaderType[];
}
