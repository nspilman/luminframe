import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ShaderControls } from '@/ClientApp/shader-controls'
import { DraftListPanel } from '@/components/creator/DraftListPanel'
import { PublishedListPanel } from '@/components/creator/PublishedListPanel'
import { LookMetaForm } from '@/components/creator/LookMetaForm'
import { StepListPanel, StepOption } from '@/components/creator/StepListPanel'
import { MacroPanel } from '@/components/creator/MacroPanel'
import { useEffectPreview } from '@/hooks/useEffectPreview'
import { useRecordPublish } from '@/hooks/useRecordPublish'
import { LookLibrary } from '@/hooks/useLooks'
import { AtprotoSession } from '@/hooks/useAtprotoSession'
import { useLuminframeDelete } from '@/hooks/useLuminframeDelete'
import { putRecipeRecord } from '@/infrastructure/atproto/recipePublish'
import { parseAtUri } from '@/infrastructure/atproto/luminframeFeed'
import { editorApplyLookPath } from '@/lib/galleryRoute'
import {
  EFFECT_SLUG_PATTERN,
  RecipeStepDef,
  buildRecipeRecord,
  parseRecipeRecord,
} from '@/effects-contract'
import {
  StoredLookDraft,
  defFromLookDraft,
  deleteLookDraft,
  loadLookDrafts,
  saveLookDraft,
} from '@/lib/lookDrafts'
import { hydrateRecipe } from '@/lib/shaders/hydrateRecipe'
import { serializeParamValue } from '@/lib/shaders/serializeRecipe'
import { EffectRegistry } from '@/types/shader'

const SAVE_DEBOUNCE_MS = 500

/** A fresh look draft, slugged uniquely against the existing set. It opens
 * with one step so the room demos itself — the preview answers immediately. */
function freshLookDraft(existing: readonly StoredLookDraft[]): StoredLookDraft {
  let slug = 'new-look'
  let n = 2
  while (existing.some((d) => d.slug === slug)) slug = `new-look-${n++}`
  return {
    slug,
    name: 'New Look',
    steps: [{ type: 'sepia' }],
    updatedAt: new Date().toISOString(),
  }
}

/**
 * The Compose room: build a Look by chaining effects — no code. Pick steps,
 * tune each one's knobs, watch the whole chain live on a test image, and
 * publish it as a com.luminframe.recipe record. The same persistence idiom as
 * the GLSL room: the open draft saves itself a beat after every change, so a
 * reload or the OAuth redirect loses nothing.
 */
type ComposePageProps = {
  session: AtprotoSession
  /** Every effect resolvable right now — the vocabulary steps choose from. */
  registry: EffectRegistry
  /** The user's Looks: drafts + published, with skips and the refetch door. */
  library: LookLibrary
}

export function ComposePage({ session, registry, library }: ComposePageProps) {
  const [drafts, setDrafts] = useState<StoredLookDraft[]>(() => loadLookDrafts())
  const [current, setCurrent] = useState<StoredLookDraft | null>(drafts[0] ?? null)
  const [selectedStep, setSelectedStep] = useState<number | null>(current?.steps.length ? 0 : null)

  // Persistence: debounced save of the working copy; a rename moves the
  // stored draft rather than forking it. (The CreatorPage idiom.)
  const persistedSlugRef = useRef<string | null>(current?.slug ?? null)
  const persist = useCallback((draft: StoredLookDraft) => {
    if (!draft.slug) return
    if (persistedSlugRef.current && persistedSlugRef.current !== draft.slug) {
      deleteLookDraft(persistedSlugRef.current)
    }
    saveLookDraft({ ...draft, updatedAt: new Date().toISOString() })
    persistedSlugRef.current = draft.slug
    setDrafts(loadLookDrafts())
  }, [])

  const pendingSaveRef = useRef<StoredLookDraft | null>(null)
  useEffect(() => {
    if (!pendingSaveRef.current) return
    const draft = pendingSaveRef.current
    const timer = setTimeout(() => {
      pendingSaveRef.current = null
      persist(draft)
    }, SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [current, persist])

  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) persist(pendingSaveRef.current)
    }
  }, [persist])

  const updateDraft = useCallback((patch: Partial<StoredLookDraft>) => {
    setCurrent((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      pendingSaveRef.current = next
      return next
    })
  }, [])

  const flushPending = useCallback(() => {
    if (pendingSaveRef.current) {
      persist(pendingSaveRef.current)
      pendingSaveRef.current = null
    }
  }, [persist])

  // Publishing: slug is the rkey; a published slug means update-in-place.
  const published = useMemo(() => library.looks.filter((l) => l.key.startsWith('at://')), [library.looks])
  const publishedSlugs = useMemo(
    () => published.map((l) => parseAtUri(l.key)?.rkey).filter((r): r is string => !!r),
    [published]
  )
  const agent = session.status === 'signed-in' ? session.agent : null
  const { state: publishState, publish, reset: resetPublish } = useRecordPublish(agent, putRecipeRecord, library.refresh)

  const selectDraft = useCallback(
    (slug: string) => {
      flushPending()
      const draft = loadLookDrafts().find((d) => d.slug === slug)
      if (!draft) return
      setCurrent(draft)
      persistedSlugRef.current = draft.slug
      setSelectedStep(draft.steps.length > 0 ? 0 : null)
      resetPublish()
    },
    [flushPending, resetPublish]
  )

  const newDraft = useCallback(() => {
    const draft = freshLookDraft(loadLookDrafts())
    persistedSlugRef.current = null
    setCurrent(draft)
    setSelectedStep(0)
    resetPublish()
    persist(draft)
  }, [persist, resetPublish])

  const removeDraft = useCallback((slug: string) => {
    deleteLookDraft(slug)
    setDrafts(loadLookDrafts())
    if (persistedSlugRef.current === slug) {
      pendingSaveRef.current = null
      persistedSlugRef.current = null
      setCurrent(null)
      setSelectedStep(null)
    }
  }, [])

  // The chain's vocabulary: everything resolvable that anyone else could also
  // resolve — builtins and at:// records. Device-local keys (draft://,
  // local://) stay out, so a composed draft is publishable by construction.
  const options = useMemo<StepOption[]>(
    () =>
      Object.entries(registry)
        .filter(([key]) => !key.includes('://') || key.startsWith('at://'))
        .map(([key, effect]) => ({ key, name: effect.name })),
    [registry]
  )

  const addStep = useCallback(
    (key: string) => {
      if (!current) return
      const steps = [...current.steps, { type: key }]
      updateDraft({ steps })
      setSelectedStep(steps.length - 1)
    },
    [current, updateDraft]
  )

  const moveStep = useCallback(
    (from: number, to: number) => {
      if (!current || to < 0 || to >= current.steps.length) return
      const steps = [...current.steps]
      const [moved] = steps.splice(from, 1)
      steps.splice(to, 0, moved)
      updateDraft({ steps })
      setSelectedStep((sel) => (sel === from ? to : sel === to ? from : sel))
    },
    [current, updateDraft]
  )

  const removeStep = useCallback(
    (index: number) => {
      if (!current) return
      const steps = current.steps.filter((_, i) => i !== index)
      updateDraft({ steps })
      setSelectedStep((sel) => {
        if (sel === null) return sel
        if (steps.length === 0) return null
        if (sel === index) return Math.min(sel, steps.length - 1)
        return sel > index ? sel - 1 : sel
      })
    },
    [current, updateDraft]
  )

  // The grammar's live judgment — cheap (no GLSL compile), so no debounce.
  const def = useMemo(() => (current ? defFromLookDraft(current) : null), [current])
  const violations = useMemo(() => {
    if (!def) return []
    const parsed = parseRecipeRecord(buildRecipeRecord(def, new Date().toISOString()))
    return parsed.ok ? [] : parsed.errors
  }, [def])

  // The chain, hydrated for rendering: registry defaults under stored values.
  const hydrated = useMemo(
    () => (current ? hydrateRecipe(current.steps, registry) : []),
    [current, registry]
  )

  const preview = useEffectPreview()
  const { loadSample } = preview

  useEffect(() => {
    void loadSample()
  }, [loadSample])

  useEffect(() => {
    if (!preview.image) return
    preview.showChain(
      hydrated.flatMap((step) => {
        const effect = registry[step.type]
        return effect ? [{ effect, values: step.params }] : []
      })
    )
  }, [hydrated, registry, preview.image, preview])

  // The selected step's knobs: hydrated values (defaults filled) in, one
  // serialized param out. Writing through serializeParamValue keeps the
  // stored step in recipe shapes — the same codec the editor's save uses.
  const selected = selectedStep !== null && current ? current.steps[selectedStep] ?? null : null
  const selectedEffect = selected ? registry[selected.type] ?? null : null
  const selectedValues = useMemo(
    () => (selected ? hydrateRecipe([selected], registry)[0]?.params ?? {} : {}),
    [selected, registry]
  )
  const updateStepParam = useCallback(
    (key: string | number, value: unknown) => {
      if (!current || selectedStep === null) return
      const serialized = serializeParamValue(value)
      if (serialized === undefined) return
      updateDraft({
        steps: current.steps.map((s, i) =>
          i === selectedStep ? { ...s, params: { ...s.params, [String(key)]: serialized } } : s
        ),
      })
    },
    [current, selectedStep, updateDraft]
  )

  const publishDraft = useCallback(() => {
    if (!current || !def) return
    flushPending()
    void publish(current.slug, def)
  }, [current, def, flushPending, publish])
  const slugPublishable = current ? EFFECT_SLUG_PATTERN.test(current.slug) : false
  const isUpdate = current ? publishedSlugs.includes(current.slug) : false

  // Managing what's published: edit seeds a draft under the record's rkey,
  // delete retracts the record.
  const deleteRecord = useLuminframeDelete(agent)
  const editPublished = useCallback(
    (key: string) => {
      const entry = published.find((l) => l.key === key)
      const rkey = entry && parseAtUri(entry.key)?.rkey
      if (!entry || !rkey) return
      flushPending()
      const draft: StoredLookDraft = {
        slug: rkey,
        name: entry.def.name,
        ...(entry.def.description ? { description: entry.def.description } : {}),
        steps: entry.def.steps as RecipeStepDef[],
        ...(entry.def.macros ? { macros: entry.def.macros } : {}),
        updatedAt: new Date().toISOString(),
      }
      saveLookDraft(draft)
      setDrafts(loadLookDrafts())
      setCurrent(draft)
      persistedSlugRef.current = rkey
      setSelectedStep(draft.steps.length > 0 ? 0 : null)
      resetPublish()
    },
    [published, flushPending, resetPublish]
  )
  const deletePublished = useCallback(
    async (uri: string) => {
      await deleteRecord(uri)
      library.refresh()
    },
    [deleteRecord, library]
  )

  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:flex-row md:overflow-hidden">
      {/* Meta column. On a phone the preview leads and this sinks below the body. */}
      <div className="order-3 space-y-5 md:order-none md:w-[280px] md:shrink-0 md:overflow-y-auto md:pr-1">
        <DraftListPanel
          drafts={drafts}
          selectedSlug={current?.slug ?? null}
          onSelect={selectDraft}
          onNew={newDraft}
          onDelete={removeDraft}
        />
        <PublishedListPanel
          published={published.map((l) => ({ key: l.key, name: l.def.name }))}
          skipped={library.skipped}
          onEdit={editPublished}
          onDelete={deletePublished}
        />
        {current && (
          <LookMetaForm draft={current} onChange={updateDraft} publishedSlugs={publishedSlugs} />
        )}
      </div>

      {/* The chain and the open step's knobs. */}
      <div className="order-2 flex min-h-0 flex-col gap-4 md:order-none md:flex-1 md:overflow-y-auto md:pr-1">
        {current ? (
          <>
            <StepListPanel
              steps={current.steps}
              nameOf={(type) => registry[type]?.name ?? type}
              selectedIndex={selectedStep}
              onSelect={setSelectedStep}
              onMove={moveStep}
              onRemove={removeStep}
              options={options}
              onAdd={addStep}
            />
            {selected && selectedEffect && (
              <div className="space-y-2 border-t border-zinc-800/50 pt-3">
                <h3 className="text-sm font-medium text-zinc-400">
                  Step {selectedStep! + 1} — {selectedEffect.name}
                </h3>
                <ShaderControls
                  effect={selectedEffect}
                  values={selectedValues}
                  onChange={updateStepParam}
                />
              </div>
            )}
            {selected && !selectedEffect && (
              <p className="text-xs text-red-400">
                ✗ This step's effect ({selected.type}) doesn't resolve on this device.
              </p>
            )}
            <MacroPanel
              macros={current.macros ?? []}
              steps={current.steps}
              registry={registry}
              nameOf={(type) => registry[type]?.name ?? type}
              onChange={(macros) => updateDraft({ macros })}
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-center">
            <div>
              <Wand2 className="mx-auto h-8 w-8 text-zinc-600" />
              <h2 className="mt-3 text-lg font-semibold text-zinc-200">Compose a look</h2>
              <p className="mt-1 max-w-sm text-sm text-zinc-500">
                Chain effects into a look of your own — no code. Tune each step live on a test
                image, and publish it when it's ready.
              </p>
              <Button type="button" onClick={newDraft} className="mt-4 bg-violet-600 text-white hover:bg-violet-700">
                Start a look
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* The proof: the whole chain on a real image. */}
      <div className="order-1 space-y-3 md:order-none md:w-[340px] md:shrink-0 md:overflow-y-auto md:pl-1">
        <canvas
          ref={preview.canvasRef}
          className="w-full rounded-lg border border-zinc-800/60 bg-black/40"
        />
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => void preview.loadSample()} className="text-zinc-300">
            Sample image
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1 text-zinc-300"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            Your own
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void preview.loadFile(file)
              e.target.value = ''
            }}
          />
        </div>
        {current && violations.length > 0 && (
          <div className="space-y-1 text-xs text-red-400">
            {violations.map((v) => (
              <p key={v}>✗ {v}</p>
            ))}
          </div>
        )}
        {current && (
          <div className="space-y-2 border-t border-zinc-800/50 pt-3">
            {session.status !== 'signed-in' ? (
              <p className="text-xs text-zinc-500">
                Sign in (top right) to publish this look to your repo.
              </p>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={publishDraft}
                  disabled={violations.length > 0 || !slugPublishable || publishState.phase === 'publishing'}
                  className="w-full gap-2 bg-violet-600 text-white hover:bg-violet-700"
                >
                  {publishState.phase === 'publishing'
                    ? 'Publishing…'
                    : isUpdate
                      ? `Update “${current.slug}”`
                      : 'Publish to your repo'}
                </Button>
                {publishState.phase === 'published' && (
                  <div className="space-y-1">
                    <p className="break-all text-xs text-emerald-400/80">
                      Published: {publishState.uri}
                    </p>
                    <a
                      href={editorApplyLookPath(publishState.uri)}
                      className="block text-xs text-violet-300 hover:text-violet-200"
                    >
                      Wear it in the editor — this link is shareable.
                    </a>
                  </div>
                )}
                {publishState.phase === 'error' && (
                  <p className="break-all text-xs text-red-400">{publishState.message}</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
