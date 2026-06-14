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

  get isEmpty(): boolean {
    return this.effects.length === 0;
  }

  get length(): number {
    return this.effects.length;
  }
}
