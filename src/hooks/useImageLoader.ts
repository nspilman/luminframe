import { useCallback } from 'react';
import { ApplicationContext } from '@/application/ApplicationContext';
import { Image } from '@/domain/models/Image';

/**
 * Single entry point for turning a user-selected File into an Image domain
 * object. Wraps the LoadImage use case so every drop target — the sidebar
 * upload today, the canvas tomorrow — shares one door instead of reaching into
 * ApplicationContext directly.
 *
 * Loading is pure File -> Image and needs no canvas, so it lives apart from
 * useRenderingEngine (which owns the canvas-bound render/save path).
 */
export function useImageLoader() {
  const loadFromFile = useCallback((file: File): Promise<Image> => {
    return ApplicationContext.getInstance().getLoadImageUseCase().loadFromFile(file);
  }, []);

  return { loadFromFile };
}
