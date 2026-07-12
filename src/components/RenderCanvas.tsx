import { forwardRef, useEffect, useRef, useState } from 'react';
import { Dimensions } from '@/domain/value-objects/Dimensions';
import { containFit } from '@/lib/containFit';

interface RenderCanvasProps {
  dimensions: [number, number];
  className?: string;
  onCanvasResize?: (dimensions: Dimensions) => void;
  // When set, an image drawn over the canvas at the same box — used by
  // hold-to-compare to show the untouched source in place of the render.
  overlayUrl?: string | null;
}

/**
 * Displays the rendered shader output, fitting the image inside the available
 * area with "contain" letterboxing — the whole image is always visible, centered
 * on a neutral matte, never stretched or clipped at any aspect ratio. The actual
 * pixels are drawn by the ThreeJSRenderingAdapter (via useRenderingEngine); this
 * component owns the fit, the drawing-buffer sizing (CSS size × devicePixelRatio,
 * for crisp output), and the hold-to-compare overlay.
 */
export const RenderCanvas = forwardRef<HTMLCanvasElement, RenderCanvasProps>(
  ({ dimensions, className = '', onCanvasResize, overlayUrl = null }, ref) => {
    const [imageWidth, imageHeight] = dimensions;
    const containerRef = useRef<HTMLDivElement>(null);
    const lastBufferRef = useRef<{ width: number; height: number } | null>(null);
    const onCanvasResizeRef = useRef(onCanvasResize);

    // The letterboxed CSS size the canvas is displayed at; the drawing buffer is
    // this × devicePixelRatio. Null until the container has been measured.
    const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null);

    useEffect(() => {
      onCanvasResizeRef.current = onCanvasResize;
    }, [onCanvasResize]);

    // Fit the image to the container and size the drawing buffer, re-running
    // whenever the image ratio changes or the container is resized (panel
    // collapse, window resize, sidebar toggle) via a ResizeObserver.
    useEffect(() => {
      const container = containerRef.current;
      if (!container || !ref || typeof ref === 'function') return;

      const measure = () => {
        const canvas = ref.current;
        if (!canvas) return;
        const rect = container.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const fit = containFit(rect.width, rect.height, imageWidth, imageHeight);
        if (fit.width <= 0 || fit.height <= 0) return;
        setDisplaySize({ width: fit.width, height: fit.height });

        // Drawing buffer = displayed CSS size × devicePixelRatio → crisp on
        // HiDPI, and its ratio equals the image ratio so nothing is distorted.
        const dpr = window.devicePixelRatio || 1;
        const bufferWidth = Math.round(fit.width * dpr);
        const bufferHeight = Math.round(fit.height * dpr);
        if (lastBufferRef.current?.width === bufferWidth && lastBufferRef.current?.height === bufferHeight) {
          return;
        }
        lastBufferRef.current = { width: bufferWidth, height: bufferHeight };
        canvas.width = bufferWidth;
        canvas.height = bufferHeight;
        onCanvasResizeRef.current?.(new Dimensions(bufferWidth, bufferHeight));
      };

      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(container);
      return () => observer.disconnect();
    }, [ref, imageWidth, imageHeight]);

    return (
      <div
        ref={containerRef}
        className="flex h-full w-full items-center justify-center overflow-hidden bg-black"
      >
        <div
          className="relative"
          style={{ width: displaySize?.width ?? 0, height: displaySize?.height ?? 0 }}
        >
          <canvas ref={ref} className={`block h-full w-full ${className}`} style={{ display: 'block' }} />
          {overlayUrl && (
            <img
              src={overlayUrl}
              alt="Original source"
              className="absolute inset-0 block h-full w-full"
            />
          )}
        </div>
      </div>
    );
  }
);

RenderCanvas.displayName = 'RenderCanvas';
