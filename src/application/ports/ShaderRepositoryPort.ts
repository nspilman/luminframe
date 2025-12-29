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
   * Get all available shader effects
   *
   * @returns Record of all shader effects
   */
  getAllShaders(): Record<ShaderType, ShaderEffect>;

  /**
   * Get a list of all available shader types
   *
   * @returns Array of shader type names
   */
  getAvailableTypes(): ShaderType[];

  /**
   * Check if a shader type exists
   *
   * @param name - The shader type to check
   * @returns true if the shader exists, false otherwise
   */
  hasShader(name: ShaderType): boolean;

  /**
   * Get metadata about a shader (name, description, category, etc.)
   *
   * @param name - The shader type
   * @returns Metadata object
   */
  getShaderMetadata(name: ShaderType): ShaderMetadata;
}

/**
 * Metadata about a shader effect
 */
export interface ShaderMetadata {
  readonly name: string;
  readonly displayName: string;
  readonly description?: string;
  readonly category?: string;
  readonly tags?: string[];
  readonly parameterCount: number;
}
