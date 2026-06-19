import { ParameterDefinition, ParameterRenderer } from './types';

/**
 * Central registry for parameter renderers: maps a shader input's UI type
 * (range, color, vec2, …) to the control that renders it.
 */
export class ParameterRegistry {
  private renderers = new Map<string, ParameterRenderer>();

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
