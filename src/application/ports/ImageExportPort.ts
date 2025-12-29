import { Image } from '@/domain/models/Image';
import { ImageFormat } from '@/domain/value-objects/ImageFormat';

/**
 * Port for exporting images.
 * Abstracts away canvas API and blob conversion specifics.
 *
 * This is an OUTPUT port - the application uses this to export images.
 */
export interface ImageExportPort {
  /**
   * Convert ImageData to a Blob in the specified format
   *
   * @param imageData - The image data to convert
   * @param format - The desired output format
   * @returns Promise resolving to a Blob
   */
  toBlob(imageData: ImageData, format: ImageFormat): Promise<Blob>;

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

  /**
   * Convert a Blob to a data URL
   *
   * @param blob - The blob to convert
   * @returns Promise resolving to a data URL string
   */
  blobToDataUrl(blob: Blob): Promise<string>;
}
