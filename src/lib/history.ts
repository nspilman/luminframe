/**
 * A linear undo/redo history: the timeline split into what came before, the
 * current value, and what was undone and can be redone.
 *
 * Committing a new value (pushHistory) clears the redo future — the classic
 * branch-on-edit rule: once you act from a point in the past, the alternate
 * future you'd undone away is gone.
 */
export interface History<T> {
  readonly past: readonly T[];
  readonly present: T;
  readonly future: readonly T[];
}

export function initHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

/** Commit a new present, pushing the old one onto the past and dropping the future. */
export function pushHistory<T>(history: History<T>, next: T): History<T> {
  return { past: [...history.past, history.present], present: next, future: [] };
}

export function canUndo<T>(history: History<T>): boolean {
  return history.past.length > 0;
}

export function canRedo<T>(history: History<T>): boolean {
  return history.future.length > 0;
}

/** Step back one commit; a no-op at the start of history. */
export function undo<T>(history: History<T>): History<T> {
  if (!canUndo(history)) {
    return history;
  }
  const previous = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

/** Step forward one undone commit; a no-op at the end of history. */
export function redo<T>(history: History<T>): History<T> {
  if (!canRedo(history)) {
    return history;
  }
  const [next, ...rest] = history.future;
  return {
    past: [...history.past, history.present],
    present: next,
    future: rest,
  };
}
