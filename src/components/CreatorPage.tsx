import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ShaderControls } from '@/ClientApp/shader-controls'
import { DraftListPanel } from '@/components/creator/DraftListPanel'
import { EffectMetaForm } from '@/components/creator/EffectMetaForm'
import { ParamBuilder } from '@/components/creator/ParamBuilder'
import { GlslEditor } from '@/components/creator/GlslEditor'
import { PublishedListPanel } from '@/components/creator/PublishedListPanel'
import { useDraftValidation } from '@/hooks/useDraftValidation'
import { useEffectPreview } from '@/hooks/useEffectPreview'
import { useRecordPublish } from '@/hooks/useRecordPublish'
import { putEffectRecord } from '@/infrastructure/atproto/effectPublish'
import { CustomEffectEntry } from '@/hooks/useCustomEffects'
import { AtprotoSession } from '@/hooks/useAtprotoSession'
import { useLuminframeDelete } from '@/hooks/useLuminframeDelete'
import { parseAtUri } from '@/infrastructure/atproto/luminframeFeed'
import { EFFECT_SLUG_PATTERN } from '@/effects-contract'
import { defFromDraft, deleteDraft, loadDrafts, saveDraft, StoredDraft } from '@/lib/effectDrafts'
import { bodyLinesFromCompileLog } from '@/lib/effectDraftValidation'
import { Color } from '@/domain/value-objects/Color'
import { EffectParamDef } from '@/effects-contract'
import { ShaderInputVars } from '@/types/shader'

const SAVE_DEBOUNCE_MS = 500

/** A fresh draft, slugged uniquely against the existing set. */
function freshDraft(existing: readonly StoredDraft[]): StoredDraft {
  let slug = 'new-effect'
  let n = 2
  while (existing.some((d) => d.slug === slug)) slug = `new-effect-${n++}`
  return {
    slug,
    name: 'New Effect',
    // Default 1: the full negative. (At 0.5 this template's mix is exactly
    // 50% gray on every pixel — mathematically right, visually "broken".)
    params: [{ type: 'range', name: 'amount', label: 'Amount', default: 1, min: 0, max: 1, step: 0.01 }],
    body: `// Start from the photo itself, then bend it.
void main() {
  vec3 c = texture2D(imageTexture, vUv).rgb;
  gl_FragColor = vec4(mix(c, 1.0 - c, amount), 1.0);
}
`,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * The Effect Creator: author a shader effect with a live preview beside it.
 * One draft is open at a time; every change persists to localStorage a beat
 * after it happens (and is flushed on unmount), so a reload — or the OAuth
 * redirect — loses nothing. The open draft flows through the same
 * validate → hydrate → compile judgment records get, and the verdict renders
 * live: named grammar errors, compiler complaints on the author's own lines,
 * and the effect itself on a test image the moment both judges pass.
 */
type CreatorPageProps = {
  session: AtprotoSession
  /** The user's published effects (at:// entries from the registry). */
  published: readonly CustomEffectEntry[]
  /** Published records that failed the pipeline, with their named reasons. */
  publishedSkipped: readonly { uri: string; reasons: string[] }[]
  /** Re-fetch published effects after a publish or delete. */
  refreshPublished: () => void
}

export function CreatorPage({ session, published, publishedSkipped, refreshPublished }: CreatorPageProps) {
  const [drafts, setDrafts] = useState<StoredDraft[]>(() => loadDrafts())
  const [current, setCurrent] = useState<StoredDraft | null>(drafts[0] ?? null)
  const [tuning, setTuning] = useState<ShaderInputVars>({})

  // Persistence: debounced save of the working copy. A rename moves the
  // stored draft rather than forking it — the old slug's entry is deleted the
  // same beat the new one is written.
  const persistedSlugRef = useRef<string | null>(current?.slug ?? null)
  const persist = useCallback((draft: StoredDraft) => {
    if (!draft.slug) return // an empty slug has no identity to store under yet
    if (persistedSlugRef.current && persistedSlugRef.current !== draft.slug) {
      deleteDraft(persistedSlugRef.current)
    }
    saveDraft({ ...draft, updatedAt: new Date().toISOString() })
    persistedSlugRef.current = draft.slug
    setDrafts(loadDrafts())
  }, [])

  const pendingSaveRef = useRef<StoredDraft | null>(null)
  useEffect(() => {
    if (!pendingSaveRef.current) return
    const draft = pendingSaveRef.current
    const timer = setTimeout(() => {
      pendingSaveRef.current = null
      persist(draft)
    }, SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [current, persist])

  // Flush the in-flight save when the room is left mid-debounce.
  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) persist(pendingSaveRef.current)
    }
  }, [persist])

  const updateDraft = useCallback((patch: Partial<StoredDraft>) => {
    setCurrent((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      pendingSaveRef.current = next
      return next
    })
  }, [])

  // Publishing: slug is the rkey, so a slug the user has already published
  // means this publish updates that record in place.
  const publishedSlugs = useMemo(
    () => published.map((e) => parseAtUri(e.key)?.rkey).filter((r): r is string => !!r),
    [published]
  )
  const agent = session.status === 'signed-in' ? session.agent : null
  const { state: publishState, publish, reset: resetPublish } = useRecordPublish(agent, putEffectRecord, refreshPublished)

  const selectDraft = useCallback(
    (slug: string) => {
      if (pendingSaveRef.current) {
        persist(pendingSaveRef.current)
        pendingSaveRef.current = null
      }
      const draft = loadDrafts().find((d) => d.slug === slug)
      if (!draft) return
      setCurrent(draft)
      persistedSlugRef.current = draft.slug
      setTuning({})
      resetPublish()
    },
    [persist, resetPublish]
  )

  const newDraft = useCallback(() => {
    const draft = freshDraft(loadDrafts())
    persistedSlugRef.current = null
    setCurrent(draft)
    setTuning({})
    resetPublish()
    persist(draft)
  }, [persist, resetPublish])

  const removeDraft = useCallback(
    (slug: string) => {
      deleteDraft(slug)
      setDrafts(loadDrafts())
      if (persistedSlugRef.current === slug) {
        pendingSaveRef.current = null
        persistedSlugRef.current = null
        setCurrent(null)
      }
    },
    []
  )

  // The live judgment and the live render.
  const def = useMemo(() => (current ? defFromDraft(current) : null), [current])
  const validation = useDraftValidation(def)
  const preview = useEffectPreview()
  const { loadSample } = preview

  // The room demos itself: the test image is there before the first keystroke.
  useEffect(() => {
    void loadSample()
  }, [loadSample])

  useEffect(() => {
    if (validation.effect && preview.image) {
      preview.showEffect(validation.effect, tuning)
    }
  }, [validation.effect, preview.image, tuning, preview])

  const compileErrors = useMemo(
    () =>
      validation.compile?.status === 'failed' && current
        ? bodyLinesFromCompileLog(
            validation.compile.log,
            // K = declared params + imageTexture + resolution + opacity
            current.params.length + 3
          )
        : [],
    [validation.compile, current]
  )

  // Tuning writes back into the authored defaults only by explicit request.
  const applyTuningAsDefaults = useCallback(() => {
    if (!current) return
    const params = current.params.map((p): EffectParamDef => {
      const v = tuning[p.name]
      if (v === undefined) return p
      switch (p.type) {
        case 'range':
          return typeof v === 'number' ? { ...p, default: v } : p
        case 'boolean':
          return typeof v === 'boolean' ? { ...p, default: v } : p
        case 'color': {
          if (!(v instanceof Color)) return p
          const [r, g, b] = Array.from(v.toFloat32Array())
          return { ...p, default: [r, g, b] }
        }
        case 'vec2': {
          const pair = v instanceof Float32Array ? Array.from(v) : v
          return Array.isArray(pair) && pair.length >= 2
            ? { ...p, default: [pair[0], pair[1]] }
            : p
        }
      }
    })
    updateDraft({ params })
  }, [current, tuning, updateDraft])

  const publishDraft = useCallback(() => {
    if (!current || !def) return
    // The store must hold what publishes: flush the debounced save first.
    if (pendingSaveRef.current) {
      persist(pendingSaveRef.current)
      pendingSaveRef.current = null
    }
    void publish(current.slug, def)
  }, [current, def, persist, publish])
  const slugPublishable = current ? EFFECT_SLUG_PATTERN.test(current.slug) : false
  const isUpdate = current ? publishedSlugs.includes(current.slug) : false

  // Managing what's already published: edit seeds a draft under the record's
  // rkey (so publishing the edit updates in place), delete retracts it.
  const deleteRecord = useLuminframeDelete(agent)
  const editPublished = useCallback(
    (key: string) => {
      const entry = published.find((e) => e.key === key)
      const rkey = entry && parseAtUri(entry.key)?.rkey
      if (!entry || !rkey) return
      if (pendingSaveRef.current) {
        persist(pendingSaveRef.current)
        pendingSaveRef.current = null
      }
      const draft: StoredDraft = {
        slug: rkey,
        name: entry.def.name,
        ...(entry.def.description ? { description: entry.def.description } : {}),
        params: entry.def.params,
        body: entry.def.body,
        ...(entry.def.animatedBy ? { animatedBy: entry.def.animatedBy } : {}),
        updatedAt: new Date().toISOString(),
      }
      saveDraft(draft)
      setDrafts(loadDrafts())
      setCurrent(draft)
      persistedSlugRef.current = rkey
      setTuning({})
      resetPublish()
    },
    [published, persist, resetPublish]
  )
  const deletePublished = useCallback(
    async (uri: string) => {
      await deleteRecord(uri)
      refreshPublished()
    },
    [deleteRecord, refreshPublished]
  )

  const fileInputRef = useRef<HTMLInputElement>(null)
  const tuned = Object.keys(tuning).length > 0

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
          published={published.map((e) => ({ key: e.key, name: e.effect.name }))}
          skipped={publishedSkipped}
          onEdit={editPublished}
          onDelete={deletePublished}
        />
        {current && (
          <>
            <EffectMetaForm draft={current} onChange={updateDraft} publishedSlugs={publishedSlugs} />
            <ParamBuilder params={current.params} onChange={(params) => updateDraft({ params })} />
          </>
        )}
      </div>

      {/* The shader body. */}
      <div className="order-2 flex min-h-0 flex-col md:order-none md:flex-1">
        {current ? (
          <GlslEditor
            body={current.body}
            onChange={(body) => updateDraft({ body })}
            grammarErrors={validation.grammarErrors}
            compileErrors={compileErrors}
            pending={validation.pending}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-center">
            <div>
              <Wand2 className="mx-auto h-8 w-8 text-zinc-600" />
              <h2 className="mt-3 text-lg font-semibold text-zinc-200">Effect Creator</h2>
              <p className="mt-1 max-w-sm text-sm text-zinc-500">
                Write a shader, watch it live on a test image, and it's yours to use in the
                editor — publish it when it's ready.
              </p>
              <Button type="button" onClick={newDraft} className="mt-4 bg-violet-600 text-white hover:bg-violet-700">
                Start an effect
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* The proof: the draft on a real image, with its own knobs live. */}
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
        {current && validation.effect && (
          <div className="space-y-3">
            <ShaderControls
              effect={validation.effect}
              values={tuning}
              onChange={(key, value) => setTuning((prev) => ({ ...prev, [key]: value }))}
            />
            {tuned && (
              <Button type="button" variant="ghost" size="sm" onClick={applyTuningAsDefaults} className="text-zinc-400">
                Use current values as defaults
              </Button>
            )}
          </div>
        )}
        {current && (
          <div className="space-y-2 border-t border-zinc-800/50 pt-3">
            {session.status !== 'signed-in' ? (
              <p className="text-xs text-zinc-500">
                Sign in (top right) to publish this effect to your repo.
              </p>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={publishDraft}
                  disabled={!validation.effect || !slugPublishable || publishState.phase === 'publishing'}
                  className="w-full gap-2 bg-violet-600 text-white hover:bg-violet-700"
                >
                  {publishState.phase === 'publishing'
                    ? 'Publishing…'
                    : isUpdate
                      ? `Update “${current.slug}”`
                      : 'Publish to your repo'}
                </Button>
                {publishState.phase === 'published' && (
                  <p className="break-all text-xs text-emerald-400/80">
                    Published: {publishState.uri}
                  </p>
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
