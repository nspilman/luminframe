import { EFFECT_SLUG_PATTERN } from '@/effects-contract'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { StoredLookDraft } from '@/lib/lookDrafts'

type LookMetaFormProps = {
  draft: StoredLookDraft
  onChange: (patch: Partial<StoredLookDraft>) => void
  /** rkeys of the user's published Looks, to say when a slug means "update". */
  publishedSlugs: readonly string[]
}

/**
 * The Look's identity: name, the record key it publishes under, and its
 * blurb — the EffectMetaForm shape without the shader-specific fields. The
 * slug doubles as the published rkey, so a slug matching an already-published
 * Look is called out: publishing then updates that record in place.
 */
export function LookMetaForm({ draft, onChange, publishedSlugs }: LookMetaFormProps) {
  const slugInvalid = !EFFECT_SLUG_PATTERN.test(draft.slug)
  const slugPublished = publishedSlugs.includes(draft.slug)

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="look-name" className="mb-1 block text-xs text-zinc-400">
          Name
        </label>
        <Input
          id="look-name"
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Dreamy Film"
        />
      </div>
      <div>
        <label htmlFor="look-slug" className="mb-1 block text-xs text-zinc-400">
          Slug — the record key it publishes under
        </label>
        <Input
          id="look-slug"
          value={draft.slug}
          onChange={(e) => onChange({ slug: e.target.value })}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="font-mono"
        />
        {slugInvalid && (
          <p className="mt-1 text-xs text-red-400">
            Lowercase letters, digits, and hyphens, starting with a letter or digit.
          </p>
        )}
        {!slugInvalid && slugPublished && (
          <p className="mt-1 text-xs text-amber-400">
            You've published “{draft.slug}” — publishing will update it in place.
          </p>
        )}
      </div>
      <div>
        <label htmlFor="look-description" className="mb-1 block text-xs text-zinc-400">
          Description (the card blurb)
        </label>
        <Textarea
          id="look-description"
          rows={2}
          value={draft.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value || undefined })}
          placeholder="What does it do to a photo?"
        />
      </div>
    </div>
  )
}
