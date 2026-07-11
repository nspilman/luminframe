# The Missing Spectrum

*A forward-looking effects manifesto. This is a **wishlist**, not a map of what exists —
per ARCHITECTURE §16, nothing here describes the current build. It describes what
Luminframe could become.*

---

## The thesis

You have sixteen effects. They are competent. They are also, right now, a **camera** —
they capture and adjust. What's missing is the part that makes someone stop scrolling:
a **soul**. An image toolkit isn't a list of filters. It's a feeling machine. And there
are whole feelings your machine cannot produce yet.

Three of them are heresies — gaps so basic they're almost invisible until you name them:

1. **You can blur, but you cannot sharpen.** Soften has three effects. Its opposite has
   zero. That's not a gap, that's a missing hand.
2. **You have no grain.** Every image you make is glassy, digital, perfect — and perfect
   is forgettable. There is no dust, no breath, no analog.
3. **You cannot draw a line.** No edges, no outline, no contour. The machine can smear
   the world but never *describe* it.

Fix those three and the toolkit grows up. Then we go further. Then we go somewhere weird.

Everything below is feasible as a **single fragment pass** (multi-tap kernels included —
that's how `dream` and `blur9` already work) unless flagged `⚠ engine`. Each effect gets
`time`, `resolution`, and the free opacity blend for nothing, and can sample a **second
image** the way `blend` does.

---

## I · The three heresies — ship these first

### 1. Sharpen / Clarity — *family: Soften (rename it "Focus")*
Unsharp mask: subtract a blurred copy from the original, add the difference back.
`original + amount * (original - blur3x3)`. One pass, one kernel you already have.
The counterweight to your entire Soften family. **Difficulty: low.**

### 2. Film Grain — *family: Texture (new)*
Animated luminance-aware noise. Reuse the `random(vec2)` hash from `glitch`, seed it
with `time`, scale grain by `1.0 - luminance` so shadows breathe more than highlights.
Params: amount, size, monochrome-vs-color. This is the single biggest "makes it feel
real" win in the whole list. **Difficulty: low.**

### 3. Edge Detect / Outline — *family: Stylize*
Sobel operator: sample the 3×3 neighborhood, compute the gradient magnitude, output it.
White-on-black, black-on-white, or edges-over-image. The seed of comic, technical, and
"ghost in the machine" looks. **Difficulty: low–medium.**

---

## II · The soul of color — your Color family is only three deep

### 4. Duotone / Gradient Map — *family: Color*
Map luminance to a ramp between two (or more) colors. Shadows → color A, highlights →
color B. The Spotify-poster, Warhol, risograph look. Two color inputs. Arguably the
highest-impact single effect you could add. **Difficulty: low.**

### 5. Split Tone / Color Grade — *family: Color*
Warm the highlights, cool the shadows — teal-and-orange, the entire language of modern
cinema. Blend a shadow tint and a highlight tint by luminance. **Difficulty: low.**

### 6. Vibrance / Saturation — *family: Color*
You literally already wrote `adjustSaturation` as a helper and **never shipped an effect
that exposes it.** Vibrance (protect skin tones, boost the muted) is the smarter sibling.
The most embarrassing gap on the list. **Difficulty: trivial.**

### 7. Sepia / Toner — *family: Color*
The one effect every human expects to find and yours doesn't have. Desaturate, then map
to a warm-brown (or selenium, or cyanotype-blue) tone. **Difficulty: trivial.**

### 8. Selective Hue — *family: Color*
Keep one hue range in full color, drain the rest to grey. The "red dress in the
black-and-white city" shot. Distance in hue space → saturation multiplier.
**Difficulty: medium.**

---

## III · Light — a family you don't have at all

### 9. Bloom / Glow — *family: Light (new)*
Threshold the bright regions, blur them, screen them back over the image. `dream` is
already 80% of the machinery — gate it on luminance and add instead of replace. The
dreamy-highlight, overexposed-romance look. **Difficulty: medium.**

### 10. Light Leak — *family: Light*
An animated warm gradient bleeding in from a corner, drifting on `time`. Pure analog
film accident, on purpose. Params: color, angle, softness, drift. **Difficulty: low.**

### 11. Lens Flare — *family: Light*
Procedural ghosts and a starburst strung along the axis from a bright point through the
center. The J.J. Abrams. Fully procedural, no assets. **Difficulty: medium–high.**

### 12. God Rays / Volumetric — *family: Light*
Radial blur sampled toward a light position, accumulating brightness — crepuscular rays.
Sample along the ray from each pixel toward the source. **Difficulty: medium.**

---

## IV · Optics — your Distort bends *geometry*; the lens bends *light*

### 13. Chromatic Aberration — *family: Optics (new)*
`rgbSplit` offsets uniformly; a real lens splits channels **radially**, growing toward
the edges and vanishing at center. Offset each channel by `distance-from-center`. The
difference between "glitch" and "expensive glass." **Difficulty: low.**

### 14. Lens Distortion — *family: Optics*
Barrel, pincushion, fisheye. Remap UVs by a radial polynomial around center. GoPro, peephole, and dreamlike-bulge in one knob. **Difficulty: low–medium.**

### 15. Tilt-Shift — *family: Optics*
A sharp band, blur falling off above and below it — turns a city into a model railroad.
Blend `blur9` by distance from a movable focus line. **Difficulty: medium.**

### 16. Swirl / Pinch / Bulge — *family: Optics*
Interactive radial warps around a point: twist by angle-with-radius, pull or push by
radial scaling. A whole family of playful distortions from one UV remap. **Difficulty: low.**

---

## V · The analog / tactile layer — *family: Texture (new)*

### 17. Halftone / Dot Screen — *family: Texture*
Comic-book and newsprint dots: sample luminance on a rotated grid, draw a dot whose
radius tracks darkness. CMYK-angled variants for the full print look. A crowd-pleaser.
**Difficulty: medium.**

### 18. Ordered Dither — *family: Texture*
Bayer-matrix thresholding → 1-bit GameBoy / Macintosh / risograph. (Note: *error-diffusion*
dither like Floyd–Steinberg is sequential and not a per-pixel op — **ordered** dither is
the shippable one.) Pairs beautifully with Posterize. **Difficulty: low.**

### 19. Scanlines / CRT / VHS — *family: Texture*
Horizontal scanlines, slight barrel curvature, chroma bleed, a rolling tracking bar on
`time`. The whole retro-monitor nostalgia bomb. Composes from optics + noise you'll
already have. **Difficulty: medium.**

### 20. Cross-Hatch / Sketch — *family: Texture*
Pencil strokes: threshold luminance into layered hatch directions. Turns a photo into an
engraving. **Difficulty: medium.**

---

## VI · The acid tier — the ones that make people say *what*

### 21. ASCII / Character Map — *family: Stylize*
Quantize luminance per cell, map to a glyph from a tiny baked font atlas (a second
texture). The photo becomes text becomes photo. **Difficulty: medium–high** (needs a
glyph atlas input).

### 22. Kuwahara — *family: Stylize*
Edge-preserving painterly filter: for each pixel, pick the neighborhood quadrant with the
lowest variance. Turns photographs into oil paintings. Heavy but single-pass. **Difficulty: high.**

### 23. Crystallize / Voronoi / Stained Glass — *family: Distort*
Shatter the image into cells that each take one color (crystallize) or keep cell borders
(stained glass). Jitter a grid of Voronoi seeds. **Difficulty: medium.**

### 24. Liquify / Domain Warp — *family: Distort*
Displace UVs by flowing value-noise — the whole image melts and drifts on `time`. The
"is this a screensaver or a feeling" effect. **Difficulty: medium.**

### 25. Displacement Map — *family: Composite*
Warp the source by a **second image's** luminance (you already carry a second input via
`blend`). Feed it ripples, a face, a fingerprint — the source flows over the hidden shape.
**Difficulty: low** (the plumbing already exists).

### 26. Feedback / Echo Trails — *family: Time (new)* — ⚠ engine
Blend each frame with a warped copy of the *previous* frame: infinite tunnels, droste
zooms, phosphor trails. **Requires a previous-frame texture the engine doesn't keep yet.**
See "the one upgrade" below.

### 27. Pixel Sort — *family: Stylize* — ⚠ engine
Sort runs of pixels by brightness along scanlines — the definitive glitch-art look.
**Not a per-pixel operation**; needs a sort/scan pass outside the current fragment model.
Aspirational; flagged honestly.

---

## What the engine can and cannot dream

Be honest about the substrate, because a vision that lies isn't a vision, it's a demo.

- **Can:** any per-pixel function; multi-tap kernels (blur, sharpen, sobel, halftone,
  kuwahara); UV remaps (all optics/distort); `time`-animated effects; effects that read a
  **second image** (displacement, custom blends, glyph atlases).
- **Cannot, today:** anything needing the **previous frame** (feedback, trails,
  reaction-diffusion); anything needing a **sort or scan** across pixels (pixel sort,
  error-diffusion dither); true separable two-pass blur *within one effect* (approximated
  fine with a big single-pass kernel).

### The one upgrade that unlocks a universe

If you add exactly **one** thing to the rendering engine — a **previous-frame texture**
bound as an input — you unlock feedback, echo trails, droste zooms, phosphor decay,
reaction-diffusion, and cellular-automata effects. That single capability is a bigger
creative multiplier than any ten effects on this list. It's the door marked *time*.

---

## The build order (if you want a plan under the trip)

| Tier | Effects | Why first |
|---|---|---|
| **1 — Heresies** | Sharpen, Film Grain, Edge Detect | Fill the holes that make the toolkit feel incomplete. |
| **2 — Color soul** | Duotone, Split Tone, Vibrance, Sepia | Cheap to build, enormous aesthetic range, your thinnest family. |
| **3 — Light** | Bloom, Light Leak, God Rays | A whole new family; `dream` is already the seed of Bloom. |
| **4 — Optics** | Chromatic Aberration, Lens Distortion, Tilt-Shift, Swirl | Turns "digital" into "cinematic." |
| **5 — Texture** | Halftone, Ordered Dither, CRT/VHS, Cross-Hatch | The analog/tactile identity. |
| **6 — Acid** | ASCII, Kuwahara, Crystallize, Liquify, Displacement | The ones people screenshot and share. |
| **7 — Engine** | previous-frame texture → Feedback, then Pixel Sort | The capability upgrade, then what it unlocks. |

Each is one file in `src/lib/shaders/effects/`, one entry in the catalog family, one
keystone-test pass — the whole point of the architecture we just made whole. Adding
beauty should be the easiest thing in this codebase. Now go make people feel something.
