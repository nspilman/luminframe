# `com.luminframe.image` v2 — executable recipe + lineage

## The gap

A saved record shows effect *chips* and calls them a "recipe," but stores only
effect **names** (`effects: string[]`). So the chips are decorative: "Open in
editor" can't reconstruct anything, and there's no record that one image was
remixed from another. Two centers are weak:

1. **The recipe isn't executable** — names without parameters can't rebuild an edit.
2. **Remixes are orphans** — no link from a derived image back to its parent.

## The v2 additions (all additive & optional)

Two new optional fields on `com.luminframe.image`. Being optional, **every
existing record still validates** and the gallery keeps working unchanged.

| Field | Type | Purpose |
|---|---|---|
| `recipe` | `array<{ type: string, params?: unknown }>` | The ordered effect stack **with parameters** — the executable edit. |
| `remixOf` | `com.atproto.repo.strongRef` (`{ uri, cid }`) | The parent record this was remixed from — lineage. |

`effects` (names) is **kept** for backward-compat and cheap chip rendering; new
writes populate both, and the gallery derives chips from `recipe` when present,
falling back to `effects` for old records. `params` is `unknown` (freeform JSON)
because parameters are effect-specific — modeling each in the lexicon would be
over-fitting.

### What "remix" means, and why not store the source (yet)

Two models were considered:

- **Reproduce** — store the *source blob* too, so remix reloads their exact
  original and replays the recipe. Faithful, but doubles blob storage per record.
- **Preset** — store only the recipe; "remix" *applies that look* to a source
  (their published result, or your own image). Light, and turns every record into
  a shareable filter.

**Decision:** ship the **preset** model — `recipe` + `remixOf` — now. It's cheap,
high-value, and makes the recipe genuinely executable. A `source` blob for exact
reproduction is a deliberate **v3** if the need proves real; leaving it out keeps
the schema honest to what's used.

## The hard constraint: republish the schema *before* writing new fields

The lexicon is published — the PDS validates writes against the
`com.atproto.lexicon.schema` record in the authority repo. Records carrying
`recipe`/`remixOf` will be **rejected** until that published schema includes them.
So the rollout order is not optional:

1. **(this commit)** Update the local lexicon JSON to v2 + teach the record
   builder the optional fields. The write path does **not** send them yet, so
   every save still validates against the current published schema. Nothing breaks.
2. **(your action)** Re-publish the schema so the network knows v2:
   ```sh
   ATP_IDENTIFIER=luminframe.com ATP_APP_PASSWORD=… \
     node scripts/publish-lexicon.mjs lexicons/com/luminframe/image.json
   ```
   (Same command/credentials as the original publish. The DNS `_lexicon` record is
   already in place and unchanged.)
3. **(next slice, after step 2)** Wire the app:
   - **Write:** `usePublish` passes the committed stack *with params* as `recipe`;
     on a remix, it passes the parent's `{uri, cid}` as `remixOf`.
   - **Read/reconstruct:** "Open in editor" replays `recipe` (apply each effect
     with its stored params) instead of just loading the baked image. Needs a new
     "apply effect N with these params" path in `useShaderEditor`, and `remixOf`
     needs the feed/view to carry each record's `cid` (currently dropped).
   - **Lineage UI:** the image page shows "remixed from @author" and, later,
     "remixes of this" (a Constellation/backlink query).

## Why this order is safe

Step 1 is inert — optional fields nobody sends. Step 2 makes the network accept
them. Only step 3 starts sending them, by which point they validate. At no point
is there a window where a save writes a field the PDS will reject.
