# Making other people's shaders discoverable and remixable

## Where this stands today

Both halves of this already exist; what's missing is one query and one button.

**Resolution across authors works.** `src/lib/shaders/foreignEffects.ts` fetches any
`at://` effect record from any repo and runs it through the identical
parse → hydrate → compile pipeline every other source uses, so a stranger's
effect can't bypass the grammar. This was built for shared images whose recipe
referenced an effect the local registry didn't hold, and it generalizes for free.

**A record already carries everything a fork needs.** `CustomEffectEntry.def`
(`src/hooks/useCustomEffects.ts`) is documented as "what an editor seeds a draft
from" — the published record holds `body` and `params`.

**Network-wide enumeration already exists, pointed at the wrong collection.**
`listNetworkDids` (`src/infrastructure/atproto/luminframeFeed.ts`) calls
`com.atproto.sync.listReposByCollection` to find every DID with an image record.
The same call with `EFFECT_COLLECTION` finds every DID with a published effect.

What's absent is only this: nothing lists another person's effects, and nothing
turns one into a draft you can edit.

## Slice 1 — Remix — **built**

Shipped as `/create?remixEffect=<at-uri>`. `editPublished` differentiated into
`seedDraft(def, slug)`; the slug is the whole difference between the two ways
in — your own record's rkey (update in place) or `remixSlug()` (a new record).

A Remix button on any effect the viewer didn't author: `entry.def` → `saveDraft`
→ route to `/create`. No lexicon change, no network work, no new validation path.

Smallest of the three, and it should go first: it's the verb that makes discovery
worth having. Discovery without remix is a list you can only look at.

## Slice 2 — A network effects source — **built**

Shipped as a "From the network" section in the picker, loading only when asked.
Entries join the registry (so applying one resolves) but not `custom` (which
stays yours); your own effects are filtered out of the section so the network
doesn't look like it is mostly you. Rows lead with `@handle` — attribution goes
before the description, since the blurb truncates.

The two are joined: selecting an effect that isn't yours shows "Remix this
effect" in the tuning card, linking to the creator. Offered there rather than on
the library row because the row's gesture is "put this on my image" and this one
leaves for another room — you ask it after you've seen the effect work.

`listReposByCollection` with `EFFECT_COLLECTION` → the existing
`mapWithConcurrency` → `fetchCollectionRecords` → `buildCustomEffectEntries`.
The picker gains a "From the network" section beside "Yours". Everything
downstream — validation, the compile gate, thumbnails, apply — already handles
foreign records.

**Fetch when the section is opened, not on load.** Compiling every stranger's
GLSL at startup is real cost, and the compile gate in `buildCustomEffectEntries`
is what keeps one broken shader from taking the whole library down. It should run
when the user asks for the section.

**Same picker, separate section** — not a second browsing surface. The picker is
already the one door to "what can I put on this image"; a second door would split
that center. This is the one genuinely contestable call here: it decides how much
stranger-authored content sits in the primary workflow.

## Slice 3 — `/?effect=<at-uri>`

So a single effect is a link you can post. `useUrlParamAction` and
`resolveForeignEffects` both exist; this is mostly routing.

## Deliberately deferred

**`remixOf` on the effect lexicon.** The honest way to show "forked from
@someone", and the image lexicon already has the field as precedent. Held back
because it's a lexicon change — which means a republish under Nate's own
credentials — and it's worth nothing until people are actually forking. Add it
once slice 1 has users.

**Ranking, trending, or curation of network effects.** Recency order is enough
until there are more effects than one screen.
