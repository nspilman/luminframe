import { RenderingPort } from '@/application/ports/RenderingPort';
import { ImageExportPort } from '@/application/ports/ImageExportPort';
import { Dimensions } from '@/domain/value-objects/Dimensions';
import { ImageFormat } from '@/domain/value-objects/ImageFormat';

/**
 * Use case for exporting rendered canvas to downloadable files.
 *
 * This orchestrates the rendering and export adapters to:
 * 1. Get the current canvas from the renderer
 * 2. Convert it to a blob in the desired format
 * 3. Trigger browser download
 */
export class ExportCanvasUseCase {
  constructor(
    private readonly renderingPort: RenderingPort,
    private readonly imageExport: ImageExportPort
  ) {}

  /**
   * Export the current rendered canvas as a download
   *
   * @param filename - Name for the downloaded file
   * @param format - Image format (PNG, JPEG, WebP)
   */
  async execute(filename: string, format: ImageFormat = ImageFormat.PNG): Promise<void> {
    // Get canvas from renderer
    const canvas = this.renderingPort.getCanvas();
    if (!canvas) {
      throw new Error('No canvas available for export');
    }

    // Get canvas dimensions
    const dimensions = new Dimensions(canvas.width, canvas.height);

    // Export canvas to blob
    const blob = await this.renderingPort.exportCanvas(dimensions, format);

    // Trigger download
    this.imageExport.download(blob, filename);
  }

  /**
   * Get the current canvas as a blob without downloading
   */
  async getBlob(format: ImageFormat = ImageFormat.PNG): Promise<Blob> {
    const canvas = this.renderingPort.getCanvas();
    if (!canvas) {
      throw new Error('No canvas available for export');
    }

    const dimensions = new Dimensions(canvas.width, canvas.height);
    return await this.renderingPort.exportCanvas(dimensions, format);
  }
}
