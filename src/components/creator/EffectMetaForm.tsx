import { EFFECT_SLUG_PATTERN } from '@/effects-contract'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StoredDraft } from '@/lib/effectDrafts'

type EffectMetaFormProps = {
  draft: StoredDraft
  onChange: (patch: Partial<StoredDraft>) => void
  /** rkeys of the user's published effects, to say when a slug means "update". */
  publishedSlugs: readonly string[]
}

const NONE = 'none'

/**
 * The effect's identity: what it's called, the record key it will publish
 * under, its blurb, and which range param (if any) gates its motion. The slug
 * doubles as the published rkey, so a slug matching an already-published
 * effect is called out — publishing then updates that record in place.
 */
export function EffectMetaForm({ draft, onChange, publishedSlugs }: EffectMetaFormProps) {
  const slugInvalid = !EFFECT_SLUG_PATTERN.test(draft.slug)
  const slugPublished = publishedSlugs.includes(draft.slug)
  const rangeParams = draft.params.filter((p) => p.type === 'range')

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="effect-name" className="mb-1 block text-xs text-zinc-400">
          Name
        </label>
        <Input
          id="effect-name"
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Warm Fade"
        />
      </div>
      <div>
        <label htmlFor="effect-slug" className="mb-1 block text-xs text-zinc-400">
          Slug — the record key it publishes under
        </label>
        <Input
          id="effect-slug"
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
        <label htmlFor="effect-description" className="mb-1 block text-xs text-zinc-400">
          Description (the card blurb)
        </label>
        <Textarea
          id="effect-description"
          rows={2}
          value={draft.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value || undefined })}
          placeholder="What does it do to a photo?"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-zinc-400">
          Animated by — the range param that gates motion (0 = still)
        </label>
        <Select
          value={draft.animatedBy ?? NONE}
          onValueChange={(v) => onChange({ animatedBy: v === NONE ? undefined : v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>none — body alone decides</SelectItem>
            {rangeParams.map((p) => (
              <SelectItem key={p.name} value={p.name}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
