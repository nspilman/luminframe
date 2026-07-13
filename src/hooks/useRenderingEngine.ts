import { useEffect, useRef, useCallback, useState } from 'react';
import { ApplicationContext } from '@/application/ApplicationContext';
import { Image } from '@/domain/models/Image';
import { Dimensions } from '@/domain/value-objects/Dimensions';
import { EditPipeline } from '@/domain/models/EditPipeline';
import { DraftEffect } from '@/application/usecases/RenderEditUseCase';

/**
 * React hook that exposes the rendering engine to components, wiring a canvas
 * ref to the ApplicationContext's rendering infrastructure through the
 * hexagonal architecture.
 *
 * Usage:
 * ```tsx
 * const { canvasRef, renderEdit, downloadImage } = useRenderingEngine();
 *
 * // Render the committed pipeline + live draft
 * renderEdit(pipeline, draft, resolution);
 * ```
 */
export function useRenderingEngine() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<ApplicationContext>();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize application context
  useEffect(() => {
    if (!contextRef.current) {
      contextRef.current = ApplicationContext.getInstance();
    }
  }, []);

  // Initialize canvas when ref is available
  useEffect(() => {
    if (canvasRef.current && contextRef.current && !isInitialized) {
      contextRef.current.setCanvas(canvasRef.current);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Update canvas dimensions
  const updateDimensions = useCallback((dimensions: Dimensions) => {
    if (!contextRef.current) return;

    const renderingAdapter = contextRef.current.getRenderingAdapter();
    renderingAdapter.updateDimensions(dimensions);
  }, []);

  /**
   * Render an edit: the committed pipeline folded, then the live draft on top.
   * With an empty committed pipeline this is a single render on the source.
   */
  const renderEdit = useCallback(
    (pipeline: EditPipeline, draft: DraftEffect | null, resolution: [number, number]) => {
      if (!contextRef.current || !isInitialized) {
        console.warn('Rendering engine not initialized yet');
        return;
      }
      try {
        contextRef.current
          .getRenderEditUseCase()
          .execute(pipeline, draft, resolution);
      } catch (error) {
        console.error('Failed to render edit:', error);
      }
    },
    [isInitialized]
  );

  /**
   * Save the current rendered canvas as an Image domain object,
   * for feeding the output back in as a shader input.
   */
  const saveCanvasAsInput = useCallback(async (): Promise<Image> => {
    if (!contextRef.current) {
      throw new Error('Rendering engine not initialized');
    }
    return contextRef.current.getSaveCanvasAsInputUseCase().execute();
  }, []);

  /**
   * Download the current rendered canvas as an image file.
   */
  const downloadImage = useCallback(async (filename: string): Promise<void> => {
    if (!contextRef.current) {
      throw new Error('Rendering engine not initialized');
    }
    return contextRef.current.getExportCanvasUseCase().execute(filename);
  }, []);

  // No unmount cleanup: the ApplicationContext is a singleton, deliberately
  // reused across component re-mounts rather than disposed here.

  return {
    canvasRef,
    renderEdit,
    saveCanvasAsInput,
    downloadImage,
    updateDimensions,
    isInitialized,
  };
}
