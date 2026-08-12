# Audit: the Luminframe effect corpus

*A Christopher Alexander reading of the 39 `com.luminframe.effect` records in
luminframe.com's repo — the canon library as of 2026-08-11. The subject is the
records themselves (fetched from the PDS, not from this repo; cite by rkey), plus
the catalog that arranges them ([catalog.ts](../src/lib/shaders/catalog.ts)).*

*A note on the medium before anything else: each record is a self-contained GLSL
body. Records cannot import from one another, so this library can never share code —
it can only share **patterns**. Every repeated idiom below is therefore not
duplication to be extracted; it is the pattern language of the corpus, and its
health is measured the way a town's is: do the repetitions agree? A second force
shapes every repair prescribed here: **a republish is a production deploy** — a
`putRecord` with no git review in the path. Repairs should be batched deliberately
and run through `scripts/publish-effect.ts` by a person.*

---

## Walking through

Read in one sitting, the corpus is legible in a way most codebases are not: every
body fits on a screen, every body ends at `gl_FragColor`, and the name on the
record says what the picture will do. That is a real achievement and it should be
named — the constraint of the medium (one fragment pass, no imports) is doing what
good constraints do.

But walking the bodies in alphabetical order, you feel the floor change underfoot.
There are **two strata** here. The newer stratum — `duotone`, `sharpen`, `outline`,
`halftone`, `dither`, `crystallize`, `split-tone`, `film-grain`, `light-leak`,
`bloom`, `tilt-shift`, `echo`, `swirl`, `cross-hatch`, `crt`, `text-overlay` —
speaks in one voice: a comment that states the *idea* ("Shadows breathe more than
highlights — the silver-halide response curve"), pixel-true sizing off the
`resolution` uniform, a clamp at the door. The older stratum — `wave`, `vignette`,
`pixelate`, `glitch`, `dream`, `neon-glow`, `kaleidoscope`, `hue-swap`,
`luminance-quantize`, `gaussian-blur`, `blend` — narrates its own syntax ("//
Sample texture with distorted coordinates"), sizes things against magic numbers,
and carries dials that don't do what their labels promise. The archaeology is even
visible in the rkeys: `luminance-quantize` wears the name "Posterize",
`light-threshold-swap` wears "Tone Swap" — renamed for people, never rebuilt.

Orientation never breaks — the corpus is too small and too flat for that. What
breaks, in the old stratum, is **trust**: you reach for the Glow Radius dial in
`neon-glow` and most of its travel does nothing.

## The centers — the repeated patterns

These are the load-bearing idioms. Each appears in enough bodies to count as a
pattern, and each is judged by whether its repetitions agree.

**1. The brightness reading** — `dot(c, vec3(0.299, 0.587, 0.114))`.
Eleven effects read brightness this way (`black-and-white`, `bloom`, `cross-hatch`,
`dither`, `duotone`, `film-grain`, `god-rays`, `halftone`, `outline`, `split-tone`,
`vibrance`). It is the strongest center in the corpus — and it is contested: `dream`
and `hue-swap` use the Rec. 709 weights (0.2126, 0.7152, 0.0722), and `light-threshold-swap`
uses `(r + g + b) * 255.0`, an unweighted sum in 8-bit units, exposed to the user
as a threshold dial running 0–765. Three rulers for one quantity. **Mixed.**

**2. The pixel ruler** — `x / resolution` for anything with a physical size.
`sharpen`, `outline`, `halftone`, `dither`, `cross-hatch`, `crystallize`,
`film-grain`, `pixelate`, `crt`, `tilt-shift`, `bloom` all measure in device
pixels of the source, which is why the preview predicts the export. Tone Swap's
body even states the covenant aloud: *"a 12px feather is 12px of the photo whether
it is being previewed small or exported full size."* One record defects —
`gaussian-blur` divides by a hardcoded `vec2(1024.0)`. **Alive, one defector.**

**3. The centered frame** — `vec2 c = vUv - 0.5`, then polar or radial math.
Eight effects (`chromatic-aberration`, `crt`, `lens-distortion`, `swirl`, `echo`,
`kaleidoscope`, `light-leak`, `vignette`). The idiom repeats cleanly; what the
repetitions disagree on is aspect — see "the honest circle" under unfinished
patterns. **Alive, incomplete.**

**4. The hash** — `fract(sin(dot(p, K)) * 43758.5453)`.
Four effects, two constant pairs, two names: `random` with (12.9898, 78.233) in
`film-grain` and `glitch`; `hash` with (127.1, 311.7) in `crystallize` and
`liquify`. Same idea, two spellings. (`dither`'s interleaved gradient noise is a
deliberate third thing — ordered, not random — and its comment says so. That
difference is earned.) **Alive; pick one spelling for the copyable form.**

**5. The gaussian gather** — the 7×7 double loop with `exp(-(i*i + j*j) / 6.0)`.
`bloom` and `tilt-shift` carry it *verbatim* — the same weights, the same
normalization — and both read honestly. `dream` carries a variant with a
parameter-dependent sigma; `neon-glow` carries a broken one (below). This is the
corpus's canonical blur, and two of its four copies are healthy. **Mixed.**

**6. The screen blend** — `1.0 - (1.0 - c) * (1.0 - light)`.
The Light family's covenant is written in [catalog.ts:84](../src/lib/shaders/catalog.ts):
*"Every one screens or adds, so it only ever brightens."* `bloom` and `light-leak`
screen — self-limiting, cannot clip. `god-rays` and `neon-glow` add raw and lean on
a final clamp. The covenant is kept; the *form* that keeps it gracefully is only
half-adopted. **Mixed.**

**7. The rotation** — a sin/cos pair applied by hand.
Six effects, three notations: explicit components (`swirl`, `echo`,
`text-overlay`), a `mat2` (`halftone`), a projection onto an angled axis
(`cross-hatch`, `rgb-split`, `light-leak`). All correct. A single blessed
two-liner would make the next author's copy obvious, but this is the least
urgent disagreement in the corpus. **Alive.**

**8. The off-frame covenant** — what a pixel pulled from outside the picture reads as.
`crt` and `lens-distortion` bail to black with an identical guard, and say why.
`wave`, `swirl`, `liquify`, `glitch`, `displacement`, `kaleidoscope`, `echo` sample
out of frame and take the clamped-edge smear. `text-overlay` masks properly.
Nobody is wrong in isolation; the corpus has simply never decided. **Mixed.**

**9. The param vocabulary.**
The main dial is called `amount` in seven effects, `intensity` in six, `strength`
(or `*Strength`) in four. The color pair `shadowColor`/`highlightColor` repeats
cleanly across `duotone` and `split-tone` — that pair is alive. The single worst
name in the corpus is `gaussian-blur`'s `pixelNumerator`, labeled "Pixel Size",
which is neither. **Mixed.**

**10. The catalog itself** ([catalog.ts](../src/lib/shaders/catalog.ts)).
Ten families, stated order, a keystone test pinning that every shader has exactly
one family, and family comments that state each family's *covenant* rather than
its contents. This is the strongest single piece of structure in the whole system.
**Alive.**

## Where the quality lives

- **`duotone`** — eight lines, one luminance read, one mix. Nothing to add,
  nothing to remove. The exemplar of the corpus's ideal form.
- **`text-overlay`** — the most *complete* body: the only effect that corrects for
  the picture's aspect, the only one that masks its own sampling edge, and its
  comments record two hard-won facts (the flipY double-flip, the clamped-edge
  smear) exactly where the next person would otherwise re-learn them.
- **`light-threshold-swap`'s feather** — the 49-tap softening carries a `ponytail:`
  comment naming its own ceiling ("a wider feather than this wants a separable
  two-pass blur") — a record that documents the force that shaped it. This is what
  every deliberate ceiling in the corpus should look like.
- **`crystallize`, `halftone`, `cross-hatch`, `dither`** — the Texture/Stylize
  cell-grid quartet: each takes the cell-grid center, does one distinct thing with
  it, and explains itself in a sentence.
- **`light-leak`** — the only record using the grammar's `animatedBy` gate
  (`drift`), so a still leak honestly exports as a still. The seed of a pattern
  the rest of the corpus needs (below).
- **`sharpen` / `outline`** — hand-unrolled kernels with the derivation in the
  comment; the reader can check the weights.
- The **catalog** and its keystone test, already named.

Protect these. In particular, do not "DRY up" the repeated luminance line or hash
function into anything — the medium has no imports, and the repetition *is* the
mechanism of coherence. What must be tended is that the copies agree.

## Where we stray

- **A dead body anchoring the Focus family** (`gaussian-blur`)
  Life: ☐ alive ☐ struggling ☒ dead ☐ killing its neighbors
  Forces: the pixel-ruler covenant (pattern 2) vs. a body written before the
  covenant existed. It divides by a hardcoded `vec2(1024.0)`, so the blur's
  physical size depends on the source's pixel count — the one thing the
  `resolution` uniform exists to prevent. Its 9 taps are spread by an opaque
  `offset` dial (0.1–5, label "Offset"), and its main dial is named
  `pixelNumerator`. Meanwhile `dream` and `tilt-shift` each carry a better blur
  *inside themselves* than the family's dedicated blur effect.
  Repair: rebuild on the canonical gaussian gather (pattern 5) with `radius` in
  device pixels and `amount` as mix-back; params named like `sharpen`'s. This is
  a body replacement, not a redesign — the record keeps its rkey, name, and place.

- **A dial that is dead for most of its travel** (`neon-glow`)
  Life: ☐ alive ☐ struggling ☒ dead ☐ killing its neighbors
  Forces: a fractional loop bound. `for (float i = -glowRadius; i <= glowRadius; i++)`
  with Glow Radius ranging 0–1 means the "blur" runs 1–3 taps total; at the
  default 0.2 it is a single tap at a sub-pixel offset — the glow is just the
  pixel tinted by `glowColor`, and the Radius dial does nothing until 1.0. (This
  uniform-bounded loop is also the construct that made this effect fall to the old
  WebGL1 compile gate; the shader has been telling us it was unusual for a while.)
  Repair: integer tap loop, radius scaling the offsets — exactly `bloom`'s shape,
  which is the same effect one family over, done right. Copy the healthy sibling.

- **NaN at the slider's own minimum** (`dream`)
  Life: ☐ alive ☒ struggling ☐ dead ☐ killing its neighbors
  Forces: a sigma derived from the dial with no floor. At `blurAmount = 0` — the
  range's stated minimum — the weight is `exp(-0/0)`: zero divided by zero, NaN,
  and the frame is undefined. One `max()` repairs it. While inside: it is one of
  only two bodies on the 709 ruler (with `hue-swap`); take it to 601 in the same
  republish.

- **Three rulers for brightness** (`light-threshold-swap`, `dream`, `hue-swap` vs. the eleven)
  Life: ☐ alive ☒ struggling ☐ dead ☐ killing its neighbors
  Forces: stacking. Effects compose in a pipeline; when Tone Swap's threshold and
  Duotone's ramp disagree about which pixels are "the lights," the user feels a
  seam they cannot name. Tone Swap's 0–765 threshold also exposes an internal unit
  as UI. The counter-force is real and must be respected: **changing a param's
  units breaks saved recipes** — records in the wild carry `threshold: 383`.
  Repair: adopt Rec. 601 as the corpus ruler (it is the 11-vote majority). For
  Tone Swap, fold the change into its already-pending republish, and keep the
  wire range while relabeling honestly, or version the param name — decide at the
  republish, but decide *once*.

- **A blurb that describes a different effect** (`hue-swap`)
  Life: ☐ alive ☒ struggling ☐ dead ☐ killing its neighbors
  Forces: the name promises "Rotate the colors"; the body transplants hue from a
  *second image*. A user who wants to nudge hues — the most common color wish —
  opens this, is asked for a file, and leaves. The lie also hides a hole: the
  corpus has no actual hue-rotate.
  Repair: reword to what it does ("Borrow another image's hues") and let the true
  Hue Rotate be born as its own effect (see edges, below).

- **Two dials that fight** (`vignette`)
  Life: ☐ alive ☒ struggling ☐ dead ☐ killing its neighbors
  Forces: `smoothstep(0.8, 0.2 * smoothness, dist * (1.0 + intensity))` — edges
  reversed (formally undefined GLSL, works by accident), intensity multiplied into
  the distance, smoothness into an edge. It renders fine; nobody can predict what
  either dial does, including the next author.
  Repair: `smoothstep(inner, outer, dist)` with intensity as the darkening mix —
  the standard form, same two dials, each doing one thing.

- **The tutorial voice** (the old stratum generally)
  Life: ☐ alive ☒ struggling ☐ dead ☐ killing its neighbors
  Forces: comments that narrate syntax ("// Convert back to cartesian
  coordinates") in a corpus whose newer records teach ("// Twist strongest at the
  center, easing to zero at the radius"). These records are public, remixable,
  and now *source material for other people's effects* — the comments are part of
  the commons. Not worth republishes of their own; repair each body's voice
  whenever it is republished for a real reason above.

## Patterns begun, not finished

These are the half-built arcades — the pattern exists, some records follow it,
and the remainder are one small republish from wholeness.

**1. The motion gate (`animatedBy`).** The grammar has it; `light-leak` uses it
(`drift`); and `wave`, `liquify`, and `glitch` — each with a `speed` dial whose
minimum is 0 — do not. At speed 0 each is a frozen picture that nevertheless
*exports as a video*, because the `time` token in the body is ungated. Three
one-field republishes (`animatedBy: "speed"`) finish the pattern. (`film-grain`
is genuinely always-moving and is honest as-is.)

**2. The honest circle.** `text-overlay` corrects for aspect
(`d.x *= resolution.x / resolution.y`) so letters keep their shape on any picture.
No radial effect does: `swirl`'s vortex, `kaleidoscope`'s petals,
`lens-distortion`'s barrel, and `chromatic-aberration`'s fringe are all ellipses
on a non-square image. The cell-grid effects solved this long ago by working in
pixels; the radial effects never adopted the same move. One line each. (Leave
`vignette` frame-relative — a vignette that follows the frame's shape is the
correct vignette. Deviation from a pattern, stated, is design.)

**3. The off-frame covenant.** `crt` and `lens-distortion` chose black-with-a-guard
and say why. The other five samplers-beyond-the-frame chose nothing — they inherit
the clamp smear silently. The repair is not necessarily black everywhere; it is
*choosing per effect and saying so in the body*, the way `text-overlay` does.

**4. The screen-blend half of the Light covenant.** `god-rays` adds raw light and
clamps. Moving it to the screen blend (its two siblings' form) makes the family's
"only brightens" covenant structural instead of clamped. `neon-glow` gets the same
form in its rebuild.

**5. One color-space idiom.** `hue-swap` carries an HSV pair; `luminance-quantize`
carries a *different*, longer HSL library — 60 of its 100 lines — used once, to
quantize one channel. Since records cannot share code, the corpus needs one
*blessed, copyable* conversion (the compact HSV pair is the better candidate) and
`luminance-quantize` rebuilt on it, at a third of its current mass.

**6. The choice param.** The grammar's param types are range, color, boolean,
image, text, vec2. Three effects use booleans as two-way switches (`isHighPass`,
`colored`, `overImage`); nothing can express a three-way choice. This edge is
*not yet* worth pushing — no current effect needs it — but the first effect that
wants named modes (blend modes is the obvious one) will either force a grammar
addition (a `select` param with fixed options) or ship as separate tiny effects.
Prefer separate tiny effects until at least two candidates want a select; then
add it to the grammar once.

## The edges — effects begging to be made

The wishlist ([EFFECTS_WISHLIST.md](EFFECTS_WISHLIST.md)) was written against the
16-effect library; its three heresies — sharpen, grain, outline — have all since
shipped. At 39, the begging edges are different, and most of them are *completions
of existing patterns* rather than new territory:

**The gaping hole first: the everyday hand tools.** The library can map a photo
to two colors, age it, shatter it into glass — and cannot *brighten* it. There is
no Exposure, no Contrast, no Temperature. `black-and-white` has a contrast dial;
color images get nothing. These are the three most-reached-for adjustments in any
photo editor, each is a five-line body on patterns the corpus already owns, and
their absence is invisible exactly the way the wishlist's heresies were: until
named. **Tone family: Exposure/Contrast (one effect or two), Temperature.**

**Completions of existing centers**, cheapest first:

- **Hue Rotate** *(Color)* — heals the `hue-swap` lie; the HSV idiom to copy is
  already in the corpus. One dial, 0–2π.
- **Ripple** *(Distort)* — `wave` is the linear wave; the radial pond-ring sibling
  is the same three params on the centered-frame pattern. The pair completes
  itself.
- **Radial Focus** *(Focus)* — `tilt-shift` keeps a sharp *band*; the portrait
  sibling keeps a sharp *circle*. Same canonical gather, the honest-circle line,
  one new effect.
- **Zoom Blur** *(Focus or Optics)* — streak samples along the ray from center:
  the centered frame plus a 1-D gather. The classic.
- **Lens Flare** *(Light)* — the family holds bloom, leak, and rays; flare is the
  fourth kind of stray light and the family's finisher. Ghost dots along the
  light–center axis; reuses `god-rays`' light-position params.
- **Dust & Scratches** *(Texture)* — the analog kit is film-grain + light-leak +
  CRT; the missing member is damage. Hash-driven specks and rare vertical
  scratches, drifting on `time`, gated by `animatedBy` from birth.
- **Mirror** *(Distort)* — fold the frame on an angled axis. Two lines of body,
  disproportionate play value; `kaleidoscope` is its maximalist cousin.

**A lonely family.** Time holds only `echo`, yet the engine's feedback machinery
(`prevFrame`, the reset-on-capture ceremony) is fully built. Two siblings beg:

- **Slit Scan** — read `prevFrame` offset by a row-dependent delay; motion smears
  into cascading stripes. One body on existing infrastructure.
- **Motion Extract** — `abs(current - prevFrame)`: show only what changed. On a
  still photo this is black *until something upstream moves* — which is exactly
  its charm in a pipeline with wave or liquify below it, and that force (it
  composes; it does not solo) should be stated in its description.

**Flagged, not urged:** ASCII mosaic wants a glyph *atlas*, which the text-texture
machinery does not yet produce — engine-adjacent, not a record-only birth.
Risograph is currently composable from dither + rgb-split + film-grain; make the
dedicated effect only if people keep hand-building it (usage is the argument, and
the gallery's `effects` arrays will show it).

## The repair sequence

Ordered so the corpus is whole after every step; each step is one batch of
republishes a person runs deliberately. Steps 1–3 are pure body fixes with no
param changes — no recipe in the wild can break.

1. **`dream`**: floor the sigma (kills the NaN at minimum); 601 ruler while inside.
2. **`neon-glow`**: rebuild the gather on `bloom`'s form; screen the glow in.
3. **`gaussian-blur`**: rebuild on the canonical gather and the pixel ruler.
   *(Param names change — `pixelNumerator` dies; this one can break saved
   recipes that reference it. Check the gallery's recipes for usage first; it is
   the least-loved effect and earliest is cheapest.)*
4. **The motion gates**: `animatedBy: "speed"` onto `wave`, `liquify`, `glitch`.
5. **The honest circle**: one aspect line into `swirl`, `kaleidoscope`,
   `lens-distortion`, `chromatic-aberration`; state the vignette exception in its
   body.
6. **`god-rays`**: screen blend. **`vignette`**: standard smoothstep form.
7. **`hue-swap`**: honest blurb — and ship **Hue Rotate** in the same batch, so
   the promise the old blurb made is kept somewhere the moment it stops being
   made falsely.
8. **The hand tools**: Exposure/Contrast, Temperature. Then the completions as
   appetite allows (Ripple, Radial Focus, Lens Flare, Dust & Scratches, the Time
   siblings).
9. **Tone Swap's ruler** rides its already-pending republish, with the
   recipe-compat decision made explicitly at that moment.
10. **Voice**: old-stratum comments are repaired opportunistically, only when a
    body is already being republished for one of the reasons above.

## The one thing

If only one repair happens: **write the canonical gaussian gather down as the
blessed, copyable form, and rebuild `gaussian-blur` and `neon-glow` on it.**

The corpus cannot share code, so its only mechanism of wholeness is the copyable
idiom — and blur is the idiom the most future effects will need (Radial Focus,
Zoom Blur, Lens Flare all gather). Today the family anchor teaches every future
author the *broken* form: a hardcoded 1024, a dial named `pixelNumerator`, a dead
radius. Fix the form in the two bodies that betray it, and every effect not yet
written inherits the repair. That is the transformation that strengthens the most
centers at once — including the ones that don't exist yet.
