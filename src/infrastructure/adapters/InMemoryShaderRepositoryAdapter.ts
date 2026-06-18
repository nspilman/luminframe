import { ShaderRepositoryPort, ShaderMetadata } from '@/application/ports/ShaderRepositoryPort';
import { ShaderEffect, ShaderType } from '@/types/shader';
import { shaderLibrary } from '@/lib/shaders';
import { categoryOf, blurbOf, effectFamilies } from '@/lib/shaders/catalog';

/** Family id → its display label, so metadata reads the curated taxonomy. */
const categoryLabels: Record<string, string> = Object.fromEntries(
  effectFamilies.map((f) => [f.id, f.label])
);

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

    return {
      name: shader.name,
      // shader.name is already the human display name (e.g. "Black & White").
      displayName: shader.name,
      description: this.generateDescription(name),
      category: this.inferCategory(name),
      tags: this.extractTags(name),
      parameterCount,
    };
  }

  /**
   * The display label of the family this effect belongs to. Reads the curated
   * catalog rather than re-deriving categories from string heuristics.
   */
  private inferCategory(type: ShaderType): string {
    return categoryLabels[categoryOf(type)] ?? 'Other';
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
    if (type.includes('glow') || type === 'neonGlow') {
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
   * The plain-speech description of an effect, from the curated catalog.
   */
  private generateDescription(type: ShaderType): string {
    return blurbOf(type);
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
