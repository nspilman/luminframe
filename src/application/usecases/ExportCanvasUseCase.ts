import { RenderingPort } from '@/application/ports/RenderingPort';
import { ImageExportPort } from '@/application/ports/ImageExportPort';
import { ImageFormat } from '@/domain/value-objects/ImageFormat';
import { encodeAnimation } from '@/lib/encodeAnimation';

/** Animation capture settings — ~2.4s at 15fps, capped so the clip stays a sane size. */
const ANIM = { fps: 15, frameCount: 36, maxSize: 480 } as const;

/**
 * Use case for exporting the current edit to a downloadable file.
 *
 * A still edit exports as a single image at the source's native resolution. An
 * animated edit (a time- or feedback-driven effect like wave or echo) would freeze
 * to one arbitrary frame that way — so it instead captures a run of frames and
 * encodes them into an animation (MP4, or GIF where WebCodecs is unavailable),
 * preserving the motion the user sees.
 */
export class ExportCanvasUseCase {
  constructor(
    private readonly renderingPort: RenderingPort,
    private readonly imageExport: ImageExportPort
  ) {}

  /**
   * Export the current edit as a download. The extension is chosen by content:
   * `.mp4` (or `.gif` on browsers without WebCodecs) for an animated edit,
   * otherwise the still format's extension.
   *
   * @param baseName - The filename without extension
   * @param format - Still image format (PNG, JPEG, WebP) — ignored when animated
   */
  async execute(baseName: string, format: ImageFormat = ImageFormat.PNG): Promise<void> {
    // Guard that a canvas exists before asking the renderer to encode it.
    if (!this.renderingPort.getCanvas()) {
      throw new Error('No canvas available for export');
    }

    if (this.renderingPort.isAnimated()) {
      const frames = await this.renderingPort.captureAnimationFrames(ANIM);
      if (frames.length > 0) {
        const { bytes, mimeType, extension } = await encodeAnimation(frames, ANIM.fps);
        const blob = new Blob([bytes], { type: mimeType });
        this.imageExport.download(blob, `${baseName}.${extension}`);
        return;
      }
      // Nothing captured — fall through to a still export rather than downloading nothing.
    }

    const blob = await this.renderingPort.exportCanvas(format);
    const ext = format.getMimeType().split('/')[1].replace('jpeg', 'jpg');
    this.imageExport.download(blob, `${baseName}.${ext}`);
  }
}
