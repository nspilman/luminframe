import { forwardRef, useEffect, useRef } from 'react';
import { Dimensions } from '@/domain/value-objects/Dimensions';

interface RenderCanvasProps {
  dimensions: [number, number];
  className?: string;
  onCanvasResize?: (dimensions: Dimensions) => void;
}

/**
 * Simple canvas component for displaying rendered shader output.
 *
 * This replaces the complex ImageScene component that used react-three-fiber.
 * The actual rendering is handled by the ThreeJSRenderingAdapter through
 * the useRenderingEngine hook.
 */
export const RenderCanvas = forwardRef<HTMLCanvasElement, RenderCanvasProps>(
  ({ dimensions, className = '', onCanvasResize }, ref) => {
    const [width, height] = dimensions;
    const aspectRatio = (height / width) * 100;
    const containerRef = useRef<HTMLDivElement>(null);

    // Update canvas size when container size changes
    useEffect(() => {
      if (!containerRef.current || !ref || typeof ref === 'function') return;

      const container = containerRef.current;
      const canvas = ref.current;
      if (!canvas) return;

      // Set canvas pixel dimensions to match container
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      // Notify parent of actual canvas dimensions
      if (onCanvasResize) {
        onCanvasResize(new Dimensions(canvas.width, canvas.height));
      }
    }, [ref, dimensions, onCanvasResize]);

    return (
      <div className="w-full relative" style={{ paddingBottom: `${aspectRatio}%` }}>
        <div ref={containerRef} className="absolute inset-0 bg-black">
          <canvas
            ref={ref}
            className={`w-full h-full ${className}`}
            style={{ display: 'block' }}
          />
        </div>
      </div>
    );
  }
);

RenderCanvas.displayName = 'RenderCanvas';
