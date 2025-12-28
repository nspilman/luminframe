import { useCallback } from 'react';
import { Image } from '@/domain/models/Image';

/**
 * Hook for exporting canvas content as a domain Image object.
 * Provides proper abstraction over canvas blob conversion.
 */
export function useCanvasExport() {
  const exportCanvasAsImage = useCallback(async (canvas: HTMLCanvasElement): Promise<Image> => {
    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/png');
    });

    // Create a File from the blob
    const file = new File([blob], 'canvas-export.png', { type: 'image/png' });

    // Create and return Image domain object
    return await Image.fromFile(file);
  }, []);

  return { exportCanvasAsImage };
}
