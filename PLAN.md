# Project plan: the image at the center

A realignment of Luminframe toward best-practice image-editing flow. The three
directions we weighed — (A) image-first reflow, (B) filmstrip live previews,
(C) non-destructive stack + history — are not three features. They are three
views of **one** structure. Build that structure and they unfold from it; bolt
them on separately and they fight each other (two meanings of "Apply," three
meanings of "the current image").

**Recommendation: all of the above — as one organic growth from a single
center, sequenced so each step leaves the whole more alive, never a torn-open
site.**

## The center everything organizes around

> A source image, anchored, with an ordered pipeline of effects folded over it.

That sentence is the whole app. Today the app has the *mechanism* for this —
"Save as Source Image" already bakes a render back into an input — but it has no
*model* for it, so the mechanism surfaces as two cryptic buttons instead of a
coherent flow. Give it the model and everything falls out:

- **"The image is the subject"** → the source is a first-class, anchored,
  centered thing. (Direction A.)
- **"Apply"** → append the current effect to the pipeline. One honest verb,
  replacing "Save as Source/Second Image." (A's primary action, correct
  semantics from day one.)
- **The render** → a fold over the pipeline. (The engine for direction C.)
- **Undo / reorder / toggle** → operations on the pipeline list. (C's surface.)
- **Before/after** → render the empty pipeline (source only) vs. the full
  pipeline. (Half of B.)
- **Filmstrip** → preview "committed pipeline + this candidate effect." (The
  other half of B.)

Every direction is the same model seen from a different side. That is why "all
of the above" is right, and also why it is *cheap* — you build one thing.

## The load-bearing technical decision

The fear with a stack is performance: N effects = N render passes every frame.
Resolved by one insight:

> The committed pipeline only changes when you Apply/undo/reorder — not while
> you tune a slider. So cache the committed result as a single base texture, and
> render only the live draft effect on top of it.

Live cost is therefore **one pass, regardless of stack depth.** Keep one cached
texture per commit level and undo/redo becomes "point at the previous cached
texture" — instant, no re-baking. The existing save-canvas-to-input primitive is
exactly the "bake on Apply" operation; it's occasional, so its readback cost is
fine. The filmstrip (B) rides on the same cached base texture — which is why B,
the flashiest-looking feature, is actually the cheapest once the foundation
exists, and belongs last.

## Two distinctions that must not blur

1. **Draft vs. committed.** Tuning sliders edits a single *draft* effect sitting
   on top of the committed stack. "Apply" commits the draft and opens a fresh
   one. Live editing stays exactly as responsive as today.
2. **Second image is a *parameter*, not a pipeline stage.** `imageTextureTwo` is
   an *input* to compositing effects (blend, threshold-swap), like a slider
   value. The current "Save as Second Image" button conflates a parameter input
   with a stack operation — that is the specific confusion to remove. Keep the
   second image as a per-effect parameter, distinct from the pipeline.

## The sequence

Reorders the naive A→B→C into **A's reflow on a C-shaped foundation, then C's
surface, then B** — because C's *model* is the foundation and B is the most
expensive polish.

### Phase 0 — Lay the foundation (invisible)

Introduce the `EditPipeline` domain model (source + ordered applied effects) and
a use case that folds it, plus the cached-base-texture render strategy.
`useShaderEditor` becomes a thin driver — the pipeline lives in domain/
application, keeping the hexagon honest. **Acceptance: a length-1 pipeline
renders pixel-identical to today.** Characterize current render behavior in a
test *before* touching the engine. Ships with no visible change — proof the
floor is solid.

### Phase 1 — Reflow to image-first (direction A)

Boot to a single invitation: *bring in your image*. Controls stay dormant until
a source exists — no armed slider adjusting nothing. The source becomes the
anchored center; "Save as Source/Second Image" is replaced by **Apply** (commit
draft) and a clear second-image parameter slot. The phase that delivers the most
life for the least code.

### Phase 2 — Make the stack visible + before/after (direction C)

The Phase 0 model gets its UI: the committed pipeline as a list — toggle,
remove, reorder, undo/redo (⌘Z). Hold-to-compare renders source-only vs. full.
Non-destructive editing becomes real and reversible.

### Phase 3 — Filmstrip live previews (direction B)

Each effect in the picker previews *your* image with that effect on top of the
committed result, using the cached base texture + one offscreen pass each.
Heaviest rendering work, lightest foundational weight — last, deliberately.

## Forces ledger

| Force | Resolution |
|---|---|
| Multi-pass performance | Cache committed result; live = 1 pass. |
| Second-image confusion | Keep it a parameter, never a stage. |
| Half-built construction site | Each phase ships a coherent, more-alive whole; Phase 0 ships at parity. |
| Characterization-first rule | Pin current behavior before each refactor; Phase 0 especially. |
| Architecture honesty | Pipeline lives in domain/application; the hook stays thin. |

## Open decision (shapes the model's edges)

Selecting a new effect in the picker is a *forward* action ("what do I add
next" — draft starts fresh on top of the committed stack), not a *replace*
action. This is the chosen model.
