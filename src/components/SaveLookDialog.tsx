import { useCallback, useMemo, useState } from 'react'
import { X, Wand2 } from 'lucide-react'
import { ModalPortal } from '@/components/ui/modal-portal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AppliedEffect } from '@/domain/models/EditPipeline'
import { EffectRegistry } from '@/types/shader'
import { AtprotoSession } from '@/hooks/useAtprotoSession'
import { useRecordPublish } from '@/hooks/useRecordPublish'
import { putRecipeRecord } from '@/infrastructure/atproto/recipePublish'
import { serializeRecipe } from '@/lib/shaders/serializeRecipe'
import { saveLookDraft } from '@/lib/lookDrafts'
import { isValidSlug, slugify } from '@/lib/slugify'
import { RecipeDefinition, buildRecipeRecord, parseRecipeRecord } from '@/effects-contract'

type SaveLookDialogProps = {
  open: boolean
  onClose: () => void
  /** The committed stack this Look names. */
  appliedEffects: readonly AppliedEffect[]
  /** For showing each step by its display name. */
  registry: EffectRegistry
  session: AtprotoSession
  /** rkeys of already-published Looks — a matching slug republishes in place. */
  publishedLookSlugs: readonly string[]
  /** Re-fetch published Looks after a successful publish. */
  refreshLooks: () => void
}

/**
 * Name the stack you just built and keep it: always as a local draft, and —
 * signed in — as a published com.luminframe.recipe record anyone can apply.
 * The chain is judged by the recipe grammar before either door opens, so a
 * stack that can't publish (say, one holding an unpublished draft effect)
 * explains itself verbatim instead of failing at the PDS.
 */
export function SaveLookDialog({
  open,
  onClose,
  appliedEffects,
  registry,
  session,
  publishedLookSlugs,
  refreshLooks,
}: SaveLookDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [draftSavedAs, setDraftSavedAs] = useState<string | null>(null)

  const agent = session.status === 'signed-in' ? session.agent : null
  const { state: publishState, publish, reset } = useRecordPublish(agent, putRecipeRecord, refreshLooks)
  const publishing = publishState.phase === 'publishing'

  const slug = slugify(name)
  const isUpdate = publishedLookSlugs.includes(slug)

  const def = useMemo<RecipeDefinition>(
    () => ({
      name: name.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      steps: serializeRecipe(appliedEffects),
    }),
    [name, description, appliedEffects]
  )

  // The grammar's judgment of this stack as a record — shown only once a name
  // exists, so an empty dialog isn't already scolding.
  const violations = useMemo<string[]>(() => {
    if (!name.trim()) return []
    const parsed = parseRecipeRecord(buildRecipeRecord(def, new Date().toISOString()))
    return parsed.ok ? [] : parsed.errors
  }, [def, name])

  const savable = name.trim().length > 0 && isValidSlug(slug) && violations.length === 0

  const dismiss = useCallback(() => {
    if (!publishing) onClose()
  }, [publishing, onClose])

  if (!open) return null

  const saveDraft = () => {
    saveLookDraft({
      slug,
      name: def.name,
      ...(def.description ? { description: def.description } : {}),
      steps: def.steps,
      updatedAt: new Date().toISOString(),
    })
    setDraftSavedAs(slug)
  }

  const stepNames = appliedEffects.map((e) => registry[e.type]?.name ?? e.type)

  return (
    <ModalPortal onDismiss={dismiss}>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label="Save this look"
        onClick={dismiss}
      >
        <div
          className="max-h-[85vh] w-[26rem] max-w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 p-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Wand2 className="h-4 w-4 text-violet-400" />
              Save this look
            </h2>
            <button
              type="button"
              onClick={dismiss}
              disabled={publishing}
              aria-label="Close"
              className="rounded-full bg-white/5 p-1.5 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mb-4 text-sm text-zinc-400">
            {stepNames.length} step{stepNames.length === 1 ? '' : 's'}:{' '}
            <span className="text-zinc-300">{stepNames.join(', ')}</span>
          </p>

          <div className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="look-name" className="text-xs text-zinc-400">
                Name
              </label>
              <Input
                id="look-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dreamy Film"
                autoFocus
              />
              {slug && (
                <p className="text-xs text-zinc-500">
                  {isUpdate ? (
                    <>
                      Updates your published look <code className="text-zinc-400">{slug}</code> in place.
                    </>
                  ) : (
                    <>
                      Saves as <code className="text-zinc-400">{slug}</code>.
                    </>
                  )}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label htmlFor="look-description" className="text-xs text-zinc-400">
                Description <span className="text-zinc-600">(optional)</span>
              </label>
              <Textarea
                id="look-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Soft blur under warm grain"
                className="min-h-[4rem] resize-none"
              />
            </div>

            {violations.length > 0 && (
              <div className="space-y-1 text-xs text-red-400">
                {violations.map((v) => (
                  <p key={v}>✗ {v}</p>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={saveDraft}
                disabled={!savable || publishing}
                className="flex-1"
              >
                Save draft
              </Button>
              {agent && (
                <Button
                  type="button"
                  onClick={() => publish(slug, def)}
                  disabled={!savable || publishing}
                  className="flex-1 bg-violet-600 text-white hover:bg-violet-700"
                >
                  {publishing ? 'Publishing…' : isUpdate ? `Update "${slug}"` : 'Publish look'}
                </Button>
              )}
            </div>

            {!agent && (
              <p className="text-xs text-zinc-500">
                Sign in (top right) to publish — drafts stay on this device.
              </p>
            )}
            {draftSavedAs && (
              <p className="text-xs text-emerald-400/80">
                Saved to your drafts — it's in the effect library under Looks.
              </p>
            )}
            {publishState.phase === 'published' && (
              <p className="break-all text-xs text-emerald-400/80">
                Published: <code>{publishState.uri}</code>
              </p>
            )}
            {publishState.phase === 'error' && (
              <p className="break-all text-xs text-red-400">✗ {publishState.message}</p>
            )}
            {(draftSavedAs || publishState.phase === 'published') && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  reset()
                  onClose()
                }}
                className="w-full text-zinc-400"
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
