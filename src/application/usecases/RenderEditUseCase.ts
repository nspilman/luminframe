import { ApplyShaderEffectUseCase } from './ApplyShaderEffectUseCase';
import { RenderingPort } from '@/application/ports/RenderingPort';
import { ImageExportPort } from '@/application/ports/ImageExportPort';
import { EditPipeline } from '@/domain/models/EditPipeline';
import { Image } from '@/domain/models/Image';
import { ShaderInputVars, ShaderType } from '@/types/shader';

/**
 * The live effect being tuned on top of the committed pipeline. Committing it
 * (Apply) appends it to the pipeline and opens a fresh draft.
 */
export interface DraftEffect {
  type: ShaderType;
  params: ShaderInputVars;
}

/**
 * Renders an edit: folds the source through each committed effect, then renders
 * the live draft on top of the result.
 *
 * The fold uses the existing single-effect renderer once per layer, reading the
 * canvas back into an Image between passes (the same primitive that powers
 * "save as input"). With a length-0 committed pipeline — the only shape the app
 * holds today — this collapses to exactly one render on the source, identical to
 * rendering the draft directly. The readback cost only appears once effects are
 * actually committed, and even then belongs off the hot path: the committed
 * result is stable while a slider is tuned, so callers cache it and re-render
 * only the draft (a Phase 2 concern).
 */
export class RenderEditUseCase {
  constructor(
    private readonly apply: ApplyShaderEffectUseCase,
    private readonly rendering: RenderingPort,
    private readonly imageExport: ImageExportPort
  ) {}

  async execute(
    pipeline: EditPipeline,
    draft: DraftEffect,
    resolution: [number, number]
  ): Promise<void> {
    if (!pipeline.source) {
      return;
    }

    let base = pipeline.source;
    for (const effect of pipeline.effects) {
      this.renderPass(base, effect.type, effect.params, resolution);
      base = await this.foldCanvasToImage();
    }

    this.renderPass(base, draft.type, draft.params, resolution);
  }

  private renderPass(
    base: Image,
    type: ShaderType,
    params: ShaderInputVars,
    resolution: [number, number]
  ): void {
    this.apply.execute(base, type, { ...params, imageTexture: base, resolution });
  }

  private async foldCanvasToImage() {
    const canvas = this.rendering.getCanvas();
    if (!canvas) {
      throw new Error('No canvas available to fold the pipeline');
    }
    return this.imageExport.canvasToImage(canvas);
  }
}
