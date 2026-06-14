import { Image } from './Image';
import { ShaderInputVars, ShaderType } from '@/types/shader';

/**
 * A single effect committed into an edit: its type and the parameter values it
 * was committed with. Immutable — operations on the pipeline return new values.
 */
export interface AppliedEffect {
  readonly type: ShaderType;
  readonly params: ShaderInputVars;
}

/**
 * The center the editor organizes around: a source image with an ordered
 * pipeline of effects folded over it.
 *
 * Today the app only ever holds a length-0 committed pipeline (one live draft
 * effect renders directly on the source), but modelling the edit as a pipeline
 * from the start is what lets "Apply", undo, reorder, before/after, and the
 * filmstrip later become views onto one structure rather than separate features.
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
  append(type: ShaderType, params: ShaderInputVars): EditPipeline {
    return new EditPipeline(this.source, [...this.effects, { type, params }]);
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

  get isEmpty(): boolean {
    return this.effects.length === 0;
  }

  get length(): number {
    return this.effects.length;
  }
}
