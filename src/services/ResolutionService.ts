import { Dimensions } from '@/domain/value-objects/Dimensions';
import { Image } from '@/domain/models/Image';

/**
 * Service for calculating image and canvas resolutions.
 * Centralizes all resolution calculation logic.
 */
export class ResolutionService {
  constructor(private readonly fallbackDimensions: Dimensions) {}

  /**
   * Calculate resolution from an image, falling back to default if null
   */
  calculateFromImage(image: Image | null): Dimensions {
    if (image) {
      return image.getDimensions();
    }
    return this.fallbackDimensions;
  }

  /**
   * Calculate resolution from window size
   * Returns default dimensions in SSR environment
   */
  calculateFromWindow(): Dimensions {
    if (typeof window === 'undefined') {
      return new Dimensions(1920, 1080);
    }
    return new Dimensions(window.innerWidth, window.innerHeight);
  }

  /**
   * Calculate resolution for shader rendering
   * Prefers image dimensions, falls back to window or default
   */
  calculateForShader(image: Image | null): Dimensions {
    return this.calculateFromImage(image);
  }

  /**
   * Calculate resolution from image or window
   * Used when no fallback is set
   */
  calculateFromImageOrWindow(image: Image | null): Dimensions {
    if (image) {
      return image.getDimensions();
    }
    return this.calculateFromWindow();
  }
}

/**
 * Default resolution service instance
 */
export const defaultResolutionService = new ResolutionService(
  new Dimensions(1920, 1080)
);
