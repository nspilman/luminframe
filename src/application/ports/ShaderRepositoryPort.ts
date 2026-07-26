import { EffectKey, ShaderEffect } from '@/types/shader';

/**
 * Port for accessing shader effects.
 * Abstracts away shader storage and retrieval specifics.
 *
 * This is an INPUT port - the application needs this to access shaders.
 */
export interface ShaderRepositoryPort {
  /**
   * Get a specific shader effect by key
   *
   * @param name - The effect key to retrieve
   * @returns The shader effect
   * @throws Error if no effect is registered under the key
   */
  getShader(name: EffectKey): ShaderEffect;

  /**
   * Get a list of all available effect keys
   *
   * @returns Array of effect keys
   */
  getAvailableTypes(): EffectKey[];
}
