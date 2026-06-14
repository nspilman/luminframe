import { initHistory, pushHistory, undo, redo, canUndo, canRedo } from './history';

describe('history', () => {
  it('starts with nothing to undo or redo', () => {
    const h = initHistory(1);
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
  });

  it('undo restores the previous present', () => {
    const h = pushHistory(initHistory(1), 2);
    expect(undo(h).present).toBe(1);
  });

  it('redo returns to the value that was undone', () => {
    const h = redo(undo(pushHistory(initHistory(1), 2)));
    expect(h.present).toBe(2);
  });

  it('pushing a new present clears the redo future', () => {
    // After undoing to 1, committing 3 abandons the 2 we'd undone away —
    // redo must have nothing to return to (branch-on-edit).
    const undone = undo(pushHistory(initHistory(1), 2));
    const branched = pushHistory(undone, 3);
    expect(canRedo(branched)).toBe(false);
  });

  it('undo at the start of history is a no-op', () => {
    const h = initHistory(1);
    expect(undo(h)).toBe(h);
  });

  it('redo at the end of history is a no-op', () => {
    const h = pushHistory(initHistory(1), 2);
    expect(redo(h)).toBe(h);
  });
});
