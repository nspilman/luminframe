import { forwardRef, useEffect, useRef } from 'react';
import { Dimensions } from '@/domain/value-objects/Dimensions';

interface RenderCanvasProps {
  dimensions: [number, number];
  className?: string;
  onCanvasResize?: (dimensions: Dimensions) => void;
  // When set, an image drawn over the canvas at the same box — used by
  // hold-to-compare to show the untouched source in place of the render.
  overlayUrl?: string | null;
}

/**
 * Simple canvas component for displaying rendered shader output. The actual
 * rendering is handled by the ThreeJSRenderingAdapter through the
 * useRenderingEngine hook; this component owns only the canvas element, its
 * responsive sizing box, and the hold-to-compare overlay.
 */
export const RenderCanvas = forwardRef<HTMLCanvasElement, RenderCanvasProps>(
  ({ dimensions, className = '', onCanvasResize, overlayUrl = null }, ref) => {
    const [width, height] = dimensions;
    const aspectRatio = (height / width) * 100;
    const containerRef = useRef<HTMLDivElement>(null);
    const lastDimensionsRef = useRef<{ width: number; height: number } | null>(null);
    const onCanvasResizeRef = useRef(onCanvasResize);

    // Keep callback ref up to date
    useEffect(() => {
      onCanvasResizeRef.current = onCanvasResize;
    }, [onCanvasResize]);

    // Update canvas size when container size changes
    useEffect(() => {
      if (!containerRef.current || !ref || typeof ref === 'function') return;

      const container = containerRef.current;
      const canvas = ref.current;
      if (!canvas) return;

      // Set canvas pixel dimensions to match container while preserving aspect ratio
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Calculate target aspect ratio from input dimensions
      const targetAspect = width / height;
      const containerAspect = rect.width / rect.height;

      let newWidth: number;
      let newHeight: number;

      // Check if aspects are close enough (within 0.1%)
      if (Math.abs(targetAspect - containerAspect) < 0.001) {
        // Aspects match, use container size directly
        newWidth = Math.round(rect.width * dpr);
        newHeight = Math.round(rect.height * dpr);
      } else {
        // Aspects don't match, calculate size that preserves target aspect
        newWidth = Math.round(rect.width * dpr);
        newHeight = Math.round(newWidth / targetAspect);
      }

      // Check if dimensions actually changed
      if (lastDimensionsRef.current?.width === newWidth && lastDimensionsRef.current?.height === newHeight) {
        return;
      }

      lastDimensionsRef.current = { width: newWidth, height: newHeight };

      canvas.width = newWidth;
      canvas.height = newHeight;

      // Notify parent of actual canvas dimensions
      if (onCanvasResizeRef.current) {
        onCanvasResizeRef.current(new Dimensions(canvas.width, canvas.height));
      }
    }, [ref, width, height]);

    return (
      <div className="w-full relative" style={{ paddingBottom: `${aspectRatio}%` }}>
        <div ref={containerRef} className="absolute inset-0 bg-black">
          <canvas
            ref={ref}
            className={`w-full h-full ${className}`}
            style={{ display: 'block' }}
          />
          {overlayUrl && (
            <img
              src={overlayUrl}
              alt="Original source"
              className="absolute inset-0 w-full h-full"
              style={{ display: 'block' }}
            />
          )}
        </div>
      </div>
    );
  }
);

RenderCanvas.displayName = 'RenderCanvas';
