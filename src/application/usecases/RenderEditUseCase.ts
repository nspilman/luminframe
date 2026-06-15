import { RenderingPort, RenderPass } from '@/application/ports/RenderingPort';
import { ShaderRepositoryPort } from '@/application/ports/ShaderRepositoryPort';
import { EditPipeline } from '@/domain/models/EditPipeline';
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
 * Renders an edit: the committed pipeline folded over the source, then the live
 * draft on top.
 *
 * This use case only assembles the work — it resolves each effect type to its
 * shader and hands the ordered list to the rendering port as a single chain. The
 * port runs it as one synchronous GPU pipeline (each pass samples the previous
 * pass's output in an offscreen framebuffer), so there is no canvas readback and
 * no async round-trip between passes. With an empty committed pipeline this is a
 * one-pass chain — the draft rendered directly on the source.
 */
export class RenderEditUseCase {
  constructor(
    private readonly shaders: ShaderRepositoryPort,
    private readonly rendering: RenderingPort
  ) {}

  execute(
    pipeline: EditPipeline,
    draft: DraftEffect,
    resolution: [number, number]
  ): void {
    if (!pipeline.source) {
      return;
    }

    const passes: RenderPass[] = [
      ...pipeline.effects.map((effect) => ({
        effect: this.shaders.getShader(effect.type),
        params: effect.params,
      })),
      { effect: this.shaders.getShader(draft.type), params: draft.params },
    ];

    this.rendering.renderChain(pipeline.source, passes, resolution);
  }
}
