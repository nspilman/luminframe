/**
 * The two offscreen framebuffers a multi-pass chain ping-pongs between.
 * A pass reads from one slot and writes to the other; the next pass swaps.
 */
export type ChainSlot = 0 | 1

/**
 * Where a single pass reads its input from and where it writes its output.
 *
 * - `input: 'source'` — sample the original source texture (only the first pass).
 * - `input: 0 | 1` — sample the framebuffer the previous pass wrote.
 * - `output: 'canvas'` — draw to the visible canvas (only the last pass).
 * - `output: 0 | 1` — draw into an offscreen framebuffer for the next pass.
 */
export interface PassPlan {
  readonly input: 'source' | ChainSlot
  readonly output: 'canvas' | ChainSlot
}

/**
 * Plan a chain of `passCount` shader passes as a ping-pong over two offscreen
 * framebuffers. This is the whole correctness of the multi-pass pipe expressed
 * as pure data: the first pass reads the source, every later pass reads exactly
 * what the pass before it wrote, and only the final pass reaches the canvas.
 *
 * Each pass writes to the slot the next pass will read, then the roles swap, so
 * a pass never reads and writes the same framebuffer (which would be undefined
 * behavior on the GPU). A single-pass chain skips framebuffers entirely and goes
 * straight to the canvas — the common case (one live effect on the source).
 */
export function planPasses(passCount: number): PassPlan[] {
  const plans: PassPlan[] = []
  let read: ChainSlot = 0
  let write: ChainSlot = 1

  for (let i = 0; i < passCount; i++) {
    const isLast = i === passCount - 1
    plans.push({
      input: i === 0 ? 'source' : read,
      output: isLast ? 'canvas' : write,
    })
    if (!isLast) {
      const swap: ChainSlot = read
      read = write
      write = swap
    }
  }

  return plans
}
