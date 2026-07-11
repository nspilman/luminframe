# Luminframe — A Pattern Language for the Architecture

**A living reference.** This document names the patterns that prevail in Luminframe
today, so that future work can reference them, amend them deliberately, and stay
aligned with the whole. It is written as a *pattern language* in the spirit of
Christopher Alexander: each pattern names a recurring situation, states the tension
in it, and resolves that tension with a rule — grounded in the actual files so the
claim can always be checked against the code.

> **The prime directive is wholeness.** Every part should be alive (reached by
> something), honest (it does what it says), and helping the parts around it. A
> part that is dead, lying, or duplicated weakens the whole even when it "works."
> When a pattern below and the code disagree, one of them is wrong — fix the code,
> or amend the pattern, but never let them drift apart in silence.

**How to use this document.** Before adding a subsystem, read the patterns it
touches. When you change an architectural boundary, update the pattern here in the
same commit. When you find the code has outgrown a pattern, amend the pattern —
this file is versioned code, not scripture.

---

## The shape of the whole

Luminframe is a **hexagonal (ports-and-adapters) architecture**. Dependencies point
*inward*: infrastructure knows about the application, the application knows about the
domain, and the domain knows about nothing but itself.

```
        ┌───────────────────────────────────────────────────────────┐
        │  Presentation — React (ClientApp, components/, hooks/)      │
        │  owns state orchestration + rendering; talks to the app     │
        │  through the ApplicationContext and a few small hooks.      │
        ├───────────────────────────────────────────────────────────┤
        │  Application — src/application/                              │
        │  ports/ (interfaces) + usecases/ (orchestration) +          │
        │  ApplicationContext (the DI container).                     │
        ├───────────────────────────────────────────────────────────┤
        │  Domain — src/domain/                                        │
        │  models/ (Image, EditPipeline) + value-objects/             │
        │  (Color, Dimensions, ImageFormat). No framework imports.    │
        ├───────────────────────────────────────────────────────────┤
        │  Infrastructure — src/infrastructure/                       │
        │  adapters/ (Three.js, browser FS, AT Protocol publish) +    │
        │  atproto/ (OAuth). Implements the ports; hides the engines. │
        └───────────────────────────────────────────────────────────┘
```

Supporting the layers: `src/parameters/` (the control-rendering registry),
`src/lib/shaders/` (the effect library + its curated catalog), and `src/lib/`
(pure helpers: history, session serialization, export).

---

## A · The layers and their boundaries

### 1. The Dependency Rule

*Context:* every module in the tree.

**Left unchecked, a rendering library or a network SDK creeps into the domain, and
the core can no longer be reasoned about or tested without a GPU or a logged-in user.**

**Therefore:** dependencies point inward only. `src/domain/` imports nothing from
`application`, `infrastructure`, `hooks`, or `components`, and never imports Three.js
or `@atproto/*`. The application layer (`src/application/`) depends on the domain and
on *port interfaces* — never on a concrete adapter. Only `src/infrastructure/` and the
composition root touch Three.js and the AT Protocol SDK.

*Grounded in:* [src/domain/](src/domain) (zero framework imports),
[src/application/usecases/RenderEditUseCase.ts](src/application/usecases/RenderEditUseCase.ts)
(depends on `RenderingPort` + `ShaderRepositoryPort`, not on `ThreeJSRenderingAdapter`).

*Related:* §2, §3, §4.

### 2. Ports Are Earned, Not Speculative

*Context:* the interfaces in [src/application/ports/](src/application/ports).

**A port added "for flexibility" but wired to nothing is decorative structure: it
implies a boundary that isn't load-bearing, and the reader trusts a seam that would
tear the moment it was leaned on.**

**Therefore:** a port exists only when it has *both* a live implementation *and* a
live caller. Every method on a port is exercised by a use case or hook. When a port
loses its last caller, delete the port — do not keep it "in case."

*Grounded in:* the live ports — `RenderingPort`, `ShaderRepositoryPort`,
`ImageLoaderPort`, `ImageExportPort`, `PublishPort` — each with an adapter and a
caller. The counter-example is instructive: `TexturePort` was deleted because nothing
implemented it and its Three.js-hiding purpose was unfulfilled (texture handling is an
*internal* detail of [ThreeJSRenderingAdapter](src/infrastructure/adapters/ThreeJSRenderingAdapter.ts),
not an application boundary). `ShaderRepositoryPort` was cut from eight methods to two
(`getShader`, `getAvailableTypes`) when the metadata/search surface proved unreachable.

*Related:* §15 (No Dead Code).

### 3. One Container Wires the Graph

*Context:* object construction across the app.

**If components `new` up their own adapters, the wiring is scattered, the singletons
multiply, and swapping an implementation means a search-and-replace.**

**Therefore:** [ApplicationContext](src/application/ApplicationContext.ts) is the single
place adapters and use cases are constructed. It is a singleton; components reach it
through [useRenderingEngine](src/hooks/useRenderingEngine.ts), which hands back a small,
named surface (`renderEdit`, `saveCanvasAsInput`, `downloadImage`, `updateDimensions`).

*The one sanctioned exception:* the offscreen thumbnail renderer
([src/lib/effectThumbnails.ts](src/lib/effectThumbnails.ts)) constructs its *own*
`ThreeJSRenderingAdapter` because it genuinely needs a **separate** offscreen canvas.
When you must build outside the container, say why in a comment — a second wiring site
is a deliberate act, not an accident.

*Related:* §12 (One Engine, One Door).

### 4. Infrastructure Hides Behind Adapters

*Context:* Three.js, the Canvas API, the AT Protocol SDK.

**Every place that touches a concrete engine directly is a place coupled to it; let
that spread and the engine becomes unremovable.**

**Therefore:** each external system is reached only through an adapter that implements
a port. Three.js lives behind [ThreeJSRenderingAdapter](src/infrastructure/adapters/ThreeJSRenderingAdapter.ts)
and [TextureAdapter](src/infrastructure/adapters/TextureAdapter.ts); the browser file
system behind [BrowserFileSystemAdapter](src/infrastructure/adapters/BrowserFileSystemAdapter.ts);
the network publish behind the `PublishPort` adapters (§19). Within infrastructure,
adapters may share concrete types freely (e.g. `TextureAdapter` hands a live
`THREE.Texture` to the rendering adapter) — the boundary that matters is the one the
*application* sees, and it sees only ports.

*Related:* §1, §19.

---

## B · One source of truth

### 5. Every Concept Has a Single Home

*Context:* any fact the code repeats — the effect taxonomy, an input's shape, a URL
format.

**When the same fact is stated in two places, they drift; one becomes a quiet lie,
and no test necessarily catches it.**

**Therefore:** each concept is stated once and read from that home everywhere.

- The **effect taxonomy** (which family each effect belongs to, its one-line blurb)
  lives once in [src/lib/shaders/catalog.ts](src/lib/shaders/catalog.ts). The picker,
  the sidebar, and the repository all read it; none re-derive categories from string
  heuristics.
- The **shape of a shader input** lives once as the discriminated union
  `ShaderInputDefinition` in [src/types/shader.ts](src/types/shader.ts). The builder
  produces it, `ShaderEffect.inputs` holds it, the renderers consume it.

*Grounded in:* [catalog.test.ts](src/lib/shaders/catalog.test.ts) pins the invariant
that *every* registered shader sits in exactly one family — so a concept's single home
cannot silently lose an entry.

*Related:* §6, §7, §8.

### 6. Preserve the Discriminant

*Context:* union types that flow across a boundary.

**A discriminated union widened to a loose shape (`{ type: string; min?: number }`)
throws away the very information that lets a consumer act safely — which then has to be
clawed back with an `as` cast, an unchecked assertion that rots the moment the union
changes.**

**Therefore:** carry the precise discriminated type all the way to its consumer; never
widen it at a boundary and re-narrow it with a cast. A consumer recovers the specific
member with a `param.type === '…'` guard, which the compiler checks.

*Grounded in:* `ShaderInputDefinition` stays discriminated from the builder
([shaderConfig.ts](src/lib/shaderConfig.ts)) through `ShaderEffect.inputs` to the
renderers, where
[RangeRenderer](src/parameters/renderers/RangeRenderer.tsx) narrows with
`if (param.type !== 'range') return null` instead of `param as RangeParameterDefinition`.

*Related:* §5, §7.

### 7. The Registry Routes, the Members Narrow

*Context:* rendering a control for each parameter type.

**A giant `if/else` over parameter types in one component couples every control to
every other and grows unboundedly; but a registry that erases types forces casts.**

**Therefore:** [ParameterRegistry](src/parameters/ParameterRegistry.ts) maps an input
`type` to a `ParameterRenderer`. Each renderer declares the value type it handles
(`ParameterRenderer<number>`, `<Color>`, …) and narrows the descriptor by its
discriminant inside `render`. The registry holds them type-erased
(`ParameterRenderer<any>`) because it is inherently heterogeneous — the single honest
`any` is at the registry, not smeared across every call site. Wiring lives once in
[defaultRegistry.ts](src/parameters/defaultRegistry.ts).

*Related:* §6, §17 (Don't Guard Impossible States).

### 8. The Builder Is the Only Door to a Descriptor

*Context:* how the sixteen effects declare their inputs.

**If each effect hand-writes raw input-descriptor objects, the shape is restated
sixteen times and drifts sixteen ways.**

**Therefore:** effects declare inputs through the fluent builder in
[src/lib/shaderConfig.ts](src/lib/shaderConfig.ts) —
`createShaderVariable('amplitude').asRange('Amplitude', 0.02, 0, 0.1, 0.001)`. The
builder is the sole producer of `ShaderInputDefinition` values and the sole owner of
cross-cutting seams like the automatic per-effect `opacity` uniform
(`wrapBodyWithOpacity`). No effect file writes a raw `{ type: '…' }` literal.

*Related:* §5, §24 (Adding an Effect).

---

## C · The domain speaks for itself

### 9. Immutable Models, Operations Return New Values

*Context:* the domain models.

**Mutating a shared model in place makes change action-at-a-distance; two holders of
the same object surprise each other, and undo/redo becomes impossible to reason about.**

**Therefore:** domain models are immutable; every operation returns a new value.
[EditPipeline](src/domain/models/EditPipeline.ts) has a private constructor and
`append`/`removeAt`/`move`/`withSource` each return a fresh pipeline. This is exactly
what lets undo/redo be a plain [history](src/lib/history.ts) of past presents.

*Related:* §11.

### 10. Value Objects Trimmed to Their Reachable Identity

*Context:* `Color`, `Dimensions`, `ImageFormat`, `Image`.

**A value object that advertises a rich vocabulary the app never speaks is a
dishonest abstraction — and worse, its tests vouch for surface nothing uses, lending
false wholeness.**

**Therefore:** a value object carries only the surface its role needs. `Color` is
hex↔float conversion for the picker and the GPU. `Dimensions` is validated width/height
plus `toArray`. Keep an abstraction *one wire from use* only when the seam is real —
e.g. `ImageFormat` keeps PNG/JPEG/WEBP because the export path is genuinely
parameterized by format, even though only PNG is wired today. Latent *data* on a live
seam is acceptable; unreachable *behavior* is not.

*Related:* §2, §15.

### 11. The Pipeline Is the Center

*Context:* how an edit is modelled.

**If "apply an effect," "undo," "reorder," and "before/after" are each built as a
separate feature, they fight; each new view needs its own bespoke state.**

**Therefore:** the edit is one structure — a source image with an ordered pipeline of
committed effects folded over it ([EditPipeline](src/domain/models/EditPipeline.ts)) —
and every capability is a *view* onto it. The live "draft" effect renders on top of the
committed fold; "Apply" appends the draft; undo/redo step the pipeline's history;
reorder is `move`. New capabilities should become views onto the pipeline, not parallel
state.

*Related:* §9, §12.

---

## D · One engine, one door

### 12. A Single Rendering Path

*Context:* everything that draws to a canvas.

**Two rendering paths drift: a fix or a feature lands in one and not the other, and the
offscreen path quietly diverges from the on-screen one.**

**Therefore:** all rendering flows through
[RenderEditUseCase](src/application/usecases/RenderEditUseCase.ts) → the port's
`renderChain`. The live editor and the offscreen thumbnail renderer render the *same
way* (an `EditPipeline` + a draft effect); the thumbnail case is just an empty committed
pipeline with the effect as the lone pass. There is no second "single-effect" entry
point.

*Related:* §3, §13.

### 13. Plans as Pure Data

*Context:* the multi-pass GPU pipeline.

**Correctness logic entangled with GPU calls can only be verified by running the GPU —
so it usually isn't verified at all.**

**Therefore:** express the correctness of a mechanism as pure data that can be tested
without the engine. [renderChainPlan.ts](src/infrastructure/adapters/renderChainPlan.ts)
computes the ping-pong of framebuffers (first pass reads the source, each later pass
reads the previous pass's output, only the last draws to the canvas) as a plain array,
tested in isolation. The adapter then merely executes the plan.

*Related:* §12, §18.

### 14. Hooks Orchestrate, Components Present

*Context:* the React tree.

**Business logic inside a presentational component cannot be reused or tested, and the
component stops being about what the user sees.**

**Therefore:** orchestration lives in hooks; components render props.
[useShaderEditor](src/ClientApp/useShaderEditor.ts) owns the editor's state machine
(selected effect, params, history, render wiring) and hands
[ClientApp](src/ClientApp/ClientApp.tsx) a flat prop bag; `ClientApp` and
[EditorSidebar](src/ClientApp/EditorSidebar.tsx) stay presentational. Cross-cutting
async concerns get their own small hooks:
[useAsyncStatus](src/hooks/useAsyncStatus.ts) is the single loading-state primitive;
[useImageLoader](src/hooks/useImageLoader.ts) is the single door for loading a source.

*Related:* §3, §7.

---

## E · Honesty — no dead or lying code

### 15. No Dead Code — Every Part Has a Live Caller

*Context:* the whole tree.

**Dead code reads as intentional. A method with no caller, a returned value nothing
destructures, a component nothing mounts — each invites a reader to build on a thing
that is already severed from the fabric.**

**Therefore:** if a symbol has no live production caller, delete it (and the tests that
only exist to keep it green). Verify reachability against the *compiler*, not a hasty
grep — the grep that "proved" `Image.dispose` dead had excluded the adapter file where
its real caller lived; `tsc` caught it. Measure before you cut (§23).

*Related:* §2, §10, §18, §23.

### 16. Comments Describe the Present

*Context:* every doc comment.

**A comment that names a vanished API (`useShader`, `ImageScene`, `renderScene`) is
worse than none — it hands the next reader a false map with the authority of intent.**

**Therefore:** comments describe what *is*. When you remove or rename something, fix the
comments that named it in the same commit. A comment's job is to explain the *why* the
code can't state itself — never to preserve a memory of the code that used to be here.

*Related:* §15. (This document is itself bound by this rule.)

### 17. Don't Guard Impossible States

*Context:* defensive branches.

**A guard against a state the type system and every producer forbid is a lie about the
code's real shape: it implies a danger that cannot occur, and the reader wastes trust
deciphering it.**

**Therefore:** trust the types the boundary guarantees. Once the parameter vocabulary
was unified (§6), `ColorRenderer` no longer coerces arrays or falls back to a "safe"
black — its value *is* a `Color`, from the defaults, the picker, and session-restore
alike. Where a runtime value genuinely is untyped (a value from the store), narrow it
honestly at that one point; do not sprinkle impossible-case guards everywhere.

*Related:* §6, §7.

### 18. Tests Catch Real Bug Classes

*Context:* the test suite (see the project's `unit-tests` guidance).

**Coverage is a vanity metric; a test that would still pass under a plausible bug, or
that only re-states the implementation, is noise that dilutes the signal of real
failures.**

**Therefore:** every test earns its keep on one of three grounds — it catches a
regression a typo would introduce, it documents a deliberate decision, or it pins math
the reader can't eyeball. Prefer pure logic over jsdom; pure functions need no mocks;
one assertion per test; parallel test names within a `describe`. The keystone tests
([catalog.test.ts](src/lib/shaders/catalog.test.ts),
[renderChainPlan](src/infrastructure/adapters/renderChainPlan.ts) tests) are the safety
nets that let the structure change without silently losing a part.

*Related:* §5, §13, §15.

---

## F · Identity and the network

### 19. One Identity, Many Targets

*Context:* publishing a finished render.

**Baking one network's API into the publish flow makes a second network a rewrite.**

**Therefore:** publishing is a [PublishPort](src/application/ports/PublishPort.ts) — the
caller hands over bytes + metadata and gets back a record URI. Each network is an adapter
behind it ([BlueskyPublishAdapter](src/infrastructure/adapters/BlueskyPublishAdapter.ts),
[GrainPublishAdapter](src/infrastructure/adapters/GrainPublishAdapter.ts)), and
[usePublish](src/hooks/usePublish.ts) picks the adapter by target and maps the result
URI to a human web URL. Record-building is pure and separately tested
([grainRecords.ts](src/infrastructure/adapters/grainRecords.ts),
[blueskyPostRecord.ts](src/infrastructure/adapters/blueskyPostRecord.ts)).

*Related:* §4, §20.

### 20. Least-Privilege Scopes

*Context:* the OAuth request.

**A broad `transition:generic` scope asks the user to trust the app with more than it
needs, and hides what the app actually does.**

**Therefore:** the requested scope is the exact set of collections and actions the app
writes, stated once in [scope.ts](src/infrastructure/atproto/scope.ts) and shared by the
runtime client and the build-time client-metadata generation. Adding a publish target
means adding its `repo:<collection>?action=create` — nothing wider. (Changing the scope
set forces re-consent for signed-in users; treat it as a visible act.)

*Related:* §19.

### 21. Survive the Redirect

*Context:* an in-progress edit when the user signs in.

**OAuth navigates the page away; an edit held only in React state is lost on return.**

**Therefore:** the edit is serialized to `localStorage` before the sign-in redirect and
rehydrated once on return ([editorSession.ts](src/lib/editorSession.ts), consumed in
[useShaderEditor](src/ClientApp/useShaderEditor.ts)). Serialization is versioned: a
snapshot from an older shape is discarded rather than rehydrated into a dead effect key.

*Related:* §9.

---

## G · How the whole grows

### 22. Piecemeal, Verified Growth

*Context:* every change to this codebase.

**A large unverified change lands as a cliff: when it breaks, the cause is buried
somewhere in the whole of it.**

**Therefore:** grow in the smallest coherent, independently-shippable slices. Each slice
is its own commit, leaves `tsc` clean and the suite green, and — when the change is
observable — is verified in the browser (`preview_*`), not assumed. A commit whose
subject is a single honest sentence is a commit that did one thing.

*Related:* §18, §23.

### 23. Measure Twice, Cut Once

*Context:* before deleting or restructuring.

**Confidence from a quick grep is how live code gets deleted (see §15's `dispose`
near-miss).**

**Therefore:** reconnoiter before you cut. Confirm callers with the compiler and a
whole-tree search; read the target before overwriting it; when the target contradicts
how it was described, surface that rather than proceeding. The four-agent audit that
produced this document is the pattern at scale: read widely, verify each claim, then act.

*Related:* §15, §22.

### 24. The Recipes — Adding to the Library

*Adding an effect:*
1. Create `src/lib/shaders/effects/<name>.ts` using the builder (§8).
2. Register it in `shaderLibrary` ([src/lib/shaders/index.ts](src/lib/shaders/index.ts)).
3. Add its key to `registeredShaders` ([src/types/shader.ts](src/types/shader.ts)).
4. Place it in a family and give it a blurb in
   [catalog.ts](src/lib/shaders/catalog.ts). **The keystone test enforces this step** —
   an effect not placed in exactly one family fails `catalog.test.ts`.
5. Add a fallback glyph in `shaderIcons`
   ([effect-picker.tsx](src/components/effect-picker.tsx)); the live per-effect
   thumbnail replaces it once rendered.

*Adding a parameter type:*
1. Add a member to the `ShaderInputDefinition` union
   ([src/types/shader.ts](src/types/shader.ts)) — keep it discriminated (§6).
2. Add a builder method in [shaderConfig.ts](src/lib/shaderConfig.ts) (§8).
3. Add a `ParameterRenderer` that narrows by `param.type`, and register it in
   [defaultRegistry.ts](src/parameters/defaultRegistry.ts) (§7).
4. Map its value → GPU uniform in `convertToUniforms`
   ([ThreeJSRenderingAdapter](src/infrastructure/adapters/ThreeJSRenderingAdapter.ts)).

*Adding a publish target:* implement [PublishPort](src/application/ports/PublishPort.ts)
as a new adapter, add its scopes to [scope.ts](src/infrastructure/atproto/scope.ts) (§20),
and wire it into [usePublish](src/hooks/usePublish.ts) (§19).

---

## Amending this document

This file is versioned code. When an architectural boundary changes, change the pattern
here in the same commit that changes the code. When the code has outgrown a pattern,
rewrite the pattern — do not leave it stale (§16). If you find a pattern the code
follows but this document doesn't name yet, add it. The goal is not fidelity to this
text; it is a codebase that is whole, and a map that always tells the truth about it.
