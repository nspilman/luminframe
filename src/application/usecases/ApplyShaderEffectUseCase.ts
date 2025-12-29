import { RenderingPort } from '@/application/ports/RenderingPort';
import { ShaderRepositoryPort } from '@/application/ports/ShaderRepositoryPort';
import { Image } from '@/domain/models/Image';
import { RenderResult } from '@/domain/value-objects/RenderResult';
import { ShaderInputVars, ShaderType } from '@/types/shader';

/**
 * Use case for applying a shader effect to an image.
 *
 * This orchestrates the rendering port and shader repository to:
 * 1. Retrieve the requested shader effect
 * 2. Apply it to the image with given parameters
 * 3. Return the rendered result
 */
export class ApplyShaderEffectUseCase {
  constructor(
    private readonly renderingPort: RenderingPort,
    private readonly shaderRepository: ShaderRepositoryPort
  ) {}

  /**
   * Execute the use case: apply a shader effect to an image
   *
   * @param image - The image to apply the effect to
   * @param shaderType - The type of shader effect to apply
   * @param parameters - Additional shader parameters (colors, intensities, etc.)
   * @returns The rendered result with the applied effect
   */
  execute(
    image: Image,
    shaderType: ShaderType,
    parameters: ShaderInputVars
  ): RenderResult {
    // Get the shader effect from the repository
    const effect = this.shaderRepository.getShader(shaderType);

    // Ensure image is in parameters
    const allParams: ShaderInputVars = {
      ...parameters,
      imageTexture: parameters.imageTexture || image,
    };

    // Render the scene with the effect
    return this.renderingPort.renderScene(image, effect, allParams);
  }

  /**
   * Get metadata about a shader effect (for UI display)
   */
  getShaderMetadata(shaderType: ShaderType) {
    return this.shaderRepository.getShaderMetadata(shaderType);
  }

  /**
   * Get all available shader types
   */
  getAvailableShaders(): ShaderType[] {
    return this.shaderRepository.getAvailableTypes();
  }
}
