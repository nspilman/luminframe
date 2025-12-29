import { useEffect, useRef, useCallback, useState } from 'react';
import { ApplicationContext } from '@/application/ApplicationContext';
import { ShaderInputVars, ShaderType } from '@/types/shader';
import { Image } from '@/domain/models/Image';
import { Dimensions } from '@/domain/value-objects/Dimensions';

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
   * Render a shader effect to the canvas
   */
  const render = useCallback(
    (image: Image, shaderType: ShaderType, parameters: ShaderInputVars) => {
      if (!contextRef.current || !isInitialized) {
        console.warn('Rendering engine not initialized yet');
        return;
      }

      try {
        const useCase = contextRef.current.getApplyShaderEffectUseCase();
        useCase.execute(image, shaderType, parameters);
      } catch (error) {
        console.error('Failed to render shader effect:', error);
        throw error;
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
    render,
    getCanvas,
    updateDimensions,
    getAvailableShaders,
    getShaderMetadata,
    isInitialized,
  };
}
