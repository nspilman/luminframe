import { useEffect, useRef, useCallback, useState } from 'react';
import { ApplicationContext } from '@/application/ApplicationContext';
import { ShaderType } from '@/types/shader';
import { Image } from '@/domain/models/Image';
import { Dimensions } from '@/domain/value-objects/Dimensions';
import { EditPipeline } from '@/domain/models/EditPipeline';
import { DraftEffect } from '@/application/usecases/RenderEditUseCase';

/**
 * React hook that provides access to the rendering engine.
 *
 * This replaces the old useShader hook and ImageScene component.
 * It uses the ApplicationContext to access the rendering infrastructure
 * through the hexagonal architecture.
 *
 * Usage:
 * ```tsx
 * const { canvasRef, render, getCanvas } = useRenderingEngine();
 *
 * // Render with new parameters
 * render(image, shaderType, parameters);
 *
 * // Get canvas for export
 * const canvas = getCanvas();
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
    (pipeline: EditPipeline, draft: DraftEffect, resolution: [number, number]) => {
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
   * Get the canvas element (for export, etc.)
   */
  const getCanvas = useCallback((): HTMLCanvasElement | null => {
    if (!contextRef.current) return null;
    return contextRef.current.getRenderingAdapter().getCanvas();
  }, []);

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

  /**
   * Get available shader types
   */
  const getAvailableShaders = useCallback((): ShaderType[] => {
    if (!contextRef.current) return [];
    return contextRef.current.getApplyShaderEffectUseCase().getAvailableShaders();
  }, []);

  /**
   * Get shader metadata
   */
  const getShaderMetadata = useCallback((shaderType: ShaderType) => {
    if (!contextRef.current) return null;
    return contextRef.current.getApplyShaderEffectUseCase().getShaderMetadata(shaderType);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Note: We don't dispose the context here because it's a singleton
      // It will be reused across component re-mounts
    };
  }, []);

  return {
    canvasRef,
    renderEdit,
    getCanvas,
    saveCanvasAsInput,
    downloadImage,
    updateDimensions,
    getAvailableShaders,
    getShaderMetadata,
    isInitialized,
  };
}
