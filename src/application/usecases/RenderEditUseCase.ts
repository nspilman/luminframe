import { RenderingPort, RenderPass } from '@/application/ports/RenderingPort';
import { ShaderRepositoryPort } from '@/application/ports/ShaderRepositoryPort';
import { EditPipeline } from '@/domain/models/EditPipeline';
import { EffectKey, ShaderInputVars } from '@/types/shader';

/**
 * A live effect being tuned on top of the committed pipeline. Committing
 * (Apply) appends to the pipeline and opens a fresh draft. Usually one at a
 * time — a staged Look is a whole chain of them.
 */
export interface DraftEffect {
  type: EffectKey;
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
 * no async round-trip between passes.
 *
 * The drafts list is empty when nothing is being tuned (the landing state,
 * before the user picks an effect). With no drafts and no committed effects
 * the chain is empty — the port renders the source unchanged, so the
 * original shows until an effect is chosen.
 */
export class RenderEditUseCase {
  constructor(
    private readonly shaders: ShaderRepositoryPort,
    private readonly rendering: RenderingPort
  ) {}

  execute(
    pipeline: EditPipeline,
    drafts: readonly DraftEffect[],
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
      ...drafts.map((draft) => ({ effect: this.shaders.getShader(draft.type), params: draft.params })),
    ];

    this.rendering.renderChain(pipeline.source, passes, resolution);
  }
}
