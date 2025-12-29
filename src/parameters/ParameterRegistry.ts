import {
  ParameterDefinition,
  ParameterRenderer,
  UniformConverter,
  UniformValue,
} from './types';

/**
 * Central registry for parameter renderers and uniform converters
 * Implements the Registry pattern for extensible parameter system
 */
export class ParameterRegistry {
  private renderers = new Map<string, ParameterRenderer>();
  private converters: UniformConverter[] = [];

  /**
   * Register a renderer for a specific parameter type
   */
  registerRenderer(type: string, renderer: ParameterRenderer): void {
    if (this.renderers.has(type)) {
      console.warn(`Renderer for type "${type}" is being overwritten`);
    }
    this.renderers.set(type, renderer);
  }

  /**
   * Register a uniform converter
   * Converters are tried in order until one matches
   */
  registerConverter(converter: UniformConverter): void {
    this.converters.push(converter);
  }

  /**
   * Get the renderer for a specific parameter type
   */
  getRenderer(param: ParameterDefinition): ParameterRenderer | undefined {
    // First try exact type match
    const exactMatch = this.renderers.get(param.type);
    if (exactMatch) {
      return exactMatch;
    }

    // Fall back to canRender check
    for (const [, renderer] of this.renderers) {
      if (renderer.canRender(param)) {
        return renderer;
      }
    }

    return undefined;
  }

  /**
   * Convert a parameter value to a uniform value
   */
  convertToUniform(value: any): UniformValue {
    for (const converter of this.converters) {
      if (converter.canConvert(value)) {
        return converter.toUniform(value);
      }
    }

    // If no converter matches, return the value as-is
    // This allows for pass-through of already-converted values
    return value;
  }

  /**
   * Check if a renderer exists for the given parameter
   */
  hasRenderer(param: ParameterDefinition): boolean {
    return this.getRenderer(param) !== undefined;
  }

  /**
   * Get all registered parameter types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.renderers.keys());
  }
}
