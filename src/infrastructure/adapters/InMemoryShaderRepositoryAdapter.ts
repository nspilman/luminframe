import { ShaderRepositoryPort, ShaderMetadata } from '@/application/ports/ShaderRepositoryPort';
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
   * Get all available shader effects
   */
  getAllShaders(): Record<ShaderType, ShaderEffect> {
    return { ...this.shaders };
  }

  /**
   * Get a list of all available shader types
   */
  getAvailableTypes(): ShaderType[] {
    return Object.keys(this.shaders) as ShaderType[];
  }

  /**
   * Check if a shader type exists
   */
  hasShader(name: ShaderType): boolean {
    return name in this.shaders;
  }

  /**
   * Get metadata about a shader
   */
  getShaderMetadata(name: ShaderType): ShaderMetadata {
    const shader = this.getShader(name); // Will throw if not found

    // Count parameters
    const parameterCount = Object.keys(shader.inputs || {}).length;

    // Generate display name from shader name
    const displayName = this.generateDisplayName(shader.name);

    // Infer category from shader name/type (basic categorization)
    const category = this.inferCategory(name);

    // Extract tags from shader type (basic tag extraction)
    const tags = this.extractTags(name);

    return {
      name: shader.name,
      displayName,
      description: this.generateDescription(shader),
      category,
      tags,
      parameterCount,
    };
  }

  /**
   * Generate a user-friendly display name from shader name
   */
  private generateDisplayName(name: string): string {
    // Convert camelCase or PascalCase to Title Case
    return name
      .replace(/([A-Z])/g, ' $1') // Add space before capital letters
      .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
      .trim();
  }

  /**
   * Infer category from shader type
   */
  private inferCategory(type: ShaderType): string {
    const categoryMap: Record<string, string> = {
      // Color effects
      blackAndWhite: 'Color',
      colorTint: 'Color',
      tint: 'Color',
      hueSwap: 'Color',
      colorQuantize: 'Color',
      luminanceQuantize: 'Color',

      // Distortion effects
      wave: 'Distortion',
      kaleidoscopeEffect: 'Distortion',
      pixelateEffect: 'Distortion',
      glitch: 'Distortion',

      // Blur/Focus effects
      gaussianBlur: 'Blur',
      dream: 'Blur',

      // Composite effects
      blend: 'Composite',
      lightThresholdSwap: 'Composite',

      // Style effects
      neonGlowEffect: 'Style',
      vignette: 'Style',
      rgbSplit: 'Style',
    };

    return categoryMap[type] || 'Other';
  }

  /**
   * Extract tags from shader type
   */
  private extractTags(type: ShaderType): string[] {
    const tags: string[] = [];

    // Add category as a tag
    tags.push(this.inferCategory(type).toLowerCase());

    // Add specific tags based on shader type
    if (type.includes('blur') || type === 'dream') {
      tags.push('blur');
    }
    if (type.includes('color') || type.includes('hue')) {
      tags.push('color');
    }
    if (type.includes('glow') || type === 'neonGlowEffect') {
      tags.push('glow');
    }
    if (type === 'blend' || type === 'lightThresholdSwap') {
      tags.push('composite', 'multi-image');
    }
    if (type.includes('pixelate') || type === 'glitch') {
      tags.push('retro');
    }

    return tags;
  }

  /**
   * Generate a description for a shader based on its properties
   */
  private generateDescription(shader: ShaderEffect): string {
    const paramCount = Object.keys(shader.inputs || {}).length;

    const descriptions: Record<string, string> = {
      blackAndWhite: 'Converts the image to black and white by desaturating colors',
      tint: 'Applies a color tint overlay to the image',
      colorTint: 'Applies a color tint overlay to the image',
      pixelateEffect: 'Creates a pixelated retro effect',
      rgbSplit: 'Separates RGB channels creating a glitch effect',
      vignette: 'Darkens the edges of the image',
      wave: 'Creates a wave distortion effect',
      kaleidoscopeEffect: 'Creates a kaleidoscope mirror effect',
      neonGlowEffect: 'Adds a neon glow effect to bright areas',
      glitch: 'Creates a digital glitch distortion effect',
      dream: 'Creates a soft, dreamy blur effect',
      blend: 'Blends two images together',
      lightThresholdSwap: 'Swaps two images based on brightness threshold',
      gaussianBlur: 'Applies a Gaussian blur to the image',
      hueSwap: 'Swaps image colors based on hue',
      colorQuantize: 'Reduces the number of colors in the image',
      luminanceQuantize: 'Quantizes brightness levels creating a posterized effect',
    };

    const defaultDescription = `Shader effect with ${paramCount} adjustable parameter${paramCount !== 1 ? 's' : ''}`;

    return descriptions[shader.name] || defaultDescription;
  }

  /**
   * Get shaders by category
   */
  getShadersByCategory(category: string): ShaderEffect[] {
    return this.getAvailableTypes()
      .filter((type) => this.inferCategory(type) === category)
      .map((type) => this.getShader(type));
  }

  /**
   * Search shaders by name or tags
   */
  searchShaders(query: string): ShaderEffect[] {
    const lowerQuery = query.toLowerCase();

    return this.getAvailableTypes()
      .filter((type) => {
        const metadata = this.getShaderMetadata(type);
        return (
          metadata.name.toLowerCase().includes(lowerQuery) ||
          metadata.displayName.toLowerCase().includes(lowerQuery) ||
          metadata.tags?.some((tag) => tag.includes(lowerQuery)) ||
          metadata.description?.toLowerCase().includes(lowerQuery)
        );
      })
      .map((type) => this.getShader(type));
  }

  /**
   * Get all unique categories
   */
  getCategories(): string[] {
    const categories = new Set(
      this.getAvailableTypes().map((type) => this.inferCategory(type))
    );
    return Array.from(categories).sort();
  }

  /**
   * Get shader count
   */
  getShaderCount(): number {
    return this.getAvailableTypes().length;
  }
}
