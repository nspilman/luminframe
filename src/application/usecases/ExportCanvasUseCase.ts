import { RenderingPort } from '@/application/ports/RenderingPort';
import { ImageExportPort } from '@/application/ports/ImageExportPort';
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
    // Guard that a canvas exists before asking the renderer to encode it.
    if (!this.renderingPort.getCanvas()) {
      throw new Error('No canvas available for export');
    }

    // Encode at the source's native resolution, then trigger the download.
    const blob = await this.renderingPort.exportCanvas(format);
    this.imageExport.download(blob, filename);
  }
}
