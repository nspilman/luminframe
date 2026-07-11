import { Image } from '@/domain/models/Image';

/**
 * Port for exporting images.
 * Abstracts away canvas API and blob conversion specifics.
 *
 * This is an OUTPUT port - the application uses this to export images.
 */
export interface ImageExportPort {
  /**
   * Convert a canvas element to a domain Image object
   *
   * @param canvas - The canvas to convert
   * @returns Promise resolving to a domain Image object
   */
  canvasToImage(canvas: HTMLCanvasElement): Promise<Image>;

  /**
   * Trigger a browser download of a blob
   *
   * @param blob - The blob to download
   * @param filename - The suggested filename
   */
  download(blob: Blob, filename: string): void;
}
