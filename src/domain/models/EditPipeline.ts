import { Image } from './Image';
import { EffectKey, ShaderInputVars } from '@/types/shader';

/**
 * A single effect committed into an edit: its type and the parameter values it
 * was committed with. Immutable — operations on the pipeline return new values.
 */
export interface AppliedEffect {
  readonly type: EffectKey;
  readonly params: ShaderInputVars;
  /** Muted: the effect keeps its place and params but is skipped when rendering. */
  readonly hidden?: boolean;
}

/**
 * The center the editor organizes around: an ordered stack of committed
 * effects, folded over a source. "Apply" appends, and undo, reorder, and
 * before/after are all views onto this one structure rather than separate
 * features — which is why the edit is modelled as a pipeline.
 *
 * `source` is borrowed, not owned. The editor keeps the photo in its own state
 * and anchors a pipeline to it with `withSource` at render time, because the
 * pipeline lives inside the undo history: were the photo held here, an undo
 * would swap the user's photo out from under them. So instances the editor
 * *stores* have a null source, and the one it *renders* carries it.
 *
 * Every operation returns a new EditPipeline; instances are never mutated.
 */
export class EditPipeline {
  private constructor(
    public readonly source: Image | null,
    public readonly effects: readonly AppliedEffect[]
  ) {}

  /** An edit with no source and no committed effects. */
  static empty(): EditPipeline {
    return new EditPipeline(null, []);
  }

  /** The same edit anchored to a (new) source image. */
  withSource(source: Image): EditPipeline {
    return new EditPipeline(source, this.effects);
  }

  /** Commit an effect on top of the pipeline. */
  append(type: EffectKey, params: ShaderInputVars, hidden?: boolean): EditPipeline {
    return new EditPipeline(this.source, [
      ...this.effects,
      hidden ? { type, params, hidden } : { type, params },
    ]);
  }

  /**
   * Retune the effect at `index` — same effect, same place in the order, new
   * parameter values. The counterpart to `append`: that one adds a step, this
   * one revises a step already standing. An out-of-range index is a no-op.
   * Revising also clears `hidden`: retuning a step you cannot see is
   * meaningless, so touching its knobs is the gesture that reveals it.
   */
  replaceAt(index: number, params: ShaderInputVars): EditPipeline {
    if (index < 0 || index >= this.effects.length) {
      return this;
    }
    return new EditPipeline(
      this.source,
      this.effects.map((e, i) => (i === index ? { type: e.type, params } : e))
    );
  }

  /**
   * Flip the effect at `index` between shown and hidden — muted, not removed:
   * it keeps its params and its place in the order. An out-of-range index is a
   * no-op.
   */
  toggleHiddenAt(index: number): EditPipeline {
    if (index < 0 || index >= this.effects.length) {
      return this;
    }
    return new EditPipeline(
      this.source,
      this.effects.map((e, i) =>
        i === index ? { type: e.type, params: e.params, hidden: !e.hidden } : e
      )
    );
  }

  /** Drop the effect at `index`. An out-of-range index is a no-op. */
  removeAt(index: number): EditPipeline {
    if (index < 0 || index >= this.effects.length) {
      return this;
    }
    return new EditPipeline(this.source, this.effects.filter((_, i) => i !== index));
  }

  /**
   * Move the effect at `from` to position `to`, shifting the rest. Order is the
   * edit — effects fold in sequence, so reordering changes the result. An
   * out-of-range index is a no-op.
   */
  move(from: number, to: number): EditPipeline {
    const last = this.effects.length - 1;
    if (from < 0 || from > last || to < 0 || to > last || from === to) {
      return this;
    }
    const next = [...this.effects];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return new EditPipeline(this.source, next);
  }
}
