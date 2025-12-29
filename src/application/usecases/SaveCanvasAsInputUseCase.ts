import { RenderingPort } from '@/application/ports/RenderingPort';
import { ImageExportPort } from '@/application/ports/ImageExportPort';
import { Image } from '@/domain/models/Image';

/**
 * Use case for converting the rendered canvas back to an Image domain object.
 *
 * This is used for the "Save as Input" feature where users want to use
 * the rendered output as input for another shader effect.
 *
 * Orchestrates:
 * 1. Get the current canvas from the renderer
 * 2. Convert it to an Image domain object
 */
export class SaveCanvasAsInputUseCase {
  constructor(
    private readonly renderingPort: RenderingPort,
    private readonly imageExport: ImageExportPort
  ) {}

  /**
   * Save the current rendered canvas as an Image domain object
   *
   * @returns Image domain object created from the canvas
   */
  async execute(): Promise<Image> {
    // Get canvas from renderer
    const canvas = this.renderingPort.getCanvas();
    if (!canvas) {
      throw new Error('No canvas available to save');
    }

    // Convert canvas to Image domain object
    return await this.imageExport.canvasToImage(canvas);
  }
}
