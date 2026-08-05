import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Maximize2, Wand2 } from 'lucide-react'
import { MinimizeButton, PanelRail } from '@/components/ui/panel-chrome'
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
import { CustomEffectEntry, buildCustomEffectEntries } from '@/hooks/useCustomEffects'
import { useUrlParamAction } from '@/hooks/useUrlParamAction'
import { fetchRecordByUri } from '@/infrastructure/atproto/repoRecords'
import { EffectDefinition } from '@/effects-contract'
import { AtprotoSession } from '@/hooks/useAtprotoSession'
import { useLuminframeDelete } from '@/hooks/useLuminframeDelete'
import { parseAtUri } from '@/infrastructure/atproto/luminframeFeed'
import { EFFECT_SLUG_PATTERN } from '@/effects-contract'
import { REMIX_EFFECT_PARAM } from '@/lib/galleryRoute'
import { defFromDraft, deleteDraft, loadDrafts, remixSlug, saveDraft, StoredDraft } from '@/lib/effectDrafts'
import { bodyLinesFromCompileLog } from '@/lib/effectDraftValidation'
import { Color } from '@/domain/value-objects/Color'
import { EffectParamDef } from '@/effects-contract'
import { ShaderInputVars } from '@/types/shader'

const SAVE_DEBOUNCE_MS = 500

type PanelKey = 'setup' | 'code' | 'preview'

/**
 * A creator column with window chrome: minimize collapses it to a slim rail
 * (vertical title on desktop, a strip on phones), and focus solos it —
 * collapsing the other two so this one gets the whole room, e.g. the preview
 * at full width while testing a shader's knobs. Hidden content stays mounted
 * (display: none, not unmount): the preview's canvas is bound to the render
 * adapter for the room's lifetime, and unmounting it would strand the
 * renderer on a detached element.
 */
function PanelChrome({
  title,
  collapsed,
  expandedClassName,
  railClassName,
  onToggle,
  onFocus,
  children,
}: {
  title: string
  collapsed: boolean
  expandedClassName: string
  railClassName: string
  onToggle: () => void
  onFocus: () => void
  children: ReactNode
}) {
  return (
    <>
      <PanelRail
        label={title}
        onExpand={onToggle}
        className={
          collapsed
            ? `rounded-lg border border-zinc-800/60 px-2 py-1.5 hover:border-zinc-700 md:w-9 md:shrink-0 md:flex-col md:py-3 ${railClassName}`
            : '!hidden'
        }
      />
      <div className={collapsed ? 'hidden' : expandedClassName}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">{title}</span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={onFocus}
              aria-label={`Focus ${title}`}
              className="rounded p-1 text-zinc-600 hover:text-zinc-300"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
            <MinimizeButton label={title} onMinimize={onToggle} />
          </div>
        </div>
        {children}
      </div>
    </>
  )
}

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

  // Open a published definition as the working draft. The slug is the caller's
  // decision and it is the whole difference between the two ways in: editing
  // your own record reuses its rkey, so publishing updates in place; remixing
  // someone's takes a fresh slug, so publishing writes a new record into your
  // repo instead of trying to overwrite theirs.
  const seedDraft = useCallback(
    (def: EffectDefinition, slug: string) => {
      if (pendingSaveRef.current) {
        persist(pendingSaveRef.current)
        pendingSaveRef.current = null
      }
      const draft: StoredDraft = {
        slug,
        name: def.name,
        ...(def.description ? { description: def.description } : {}),
        params: def.params,
        body: def.body,
        ...(def.animatedBy ? { animatedBy: def.animatedBy } : {}),
        updatedAt: new Date().toISOString(),
      }
      saveDraft(draft)
      setDrafts(loadDrafts())
      setCurrent(draft)
      persistedSlugRef.current = slug
      setTuning({})
      resetPublish()
    },
    [persist, resetPublish]
  )

  // Managing what's already published: edit seeds a draft under the record's
  // rkey (so publishing the edit updates in place), delete retracts it.
  const deleteRecord = useLuminframeDelete(agent)
  const editPublished = useCallback(
    (key: string) => {
      const entry = published.find((e) => e.key === key)
      const rkey = entry && parseAtUri(entry.key)?.rkey
      if (!entry || !rkey) return
      seedDraft(entry.def, rkey)
    },
    [published, seedDraft]
  )
  // The shareable door onto anyone's published effect (see REMIX_EFFECT_PARAM
  // for why it is not simply `remix`).
  // The record runs the same parse → hydrate → compile judgment every other
  // source does (buildCustomEffectEntries), so a stranger's shader can no more
  // bypass the grammar here than it can in the picker. An unresolvable or
  // invalid record resolves to null and the instruction is simply spent: the
  // author keeps whatever draft they had open rather than losing it to a bad link.
  useUrlParamAction(
    REMIX_EFFECT_PARAM,
    async (uri: string) => {
      const record = await fetchRecordByUri(uri)
      if (!record) return null
      const { entries } = buildCustomEffectEntries([record])
      return entries[0]?.def ?? null
    },
    (def: EffectDefinition | null) => {
      if (!def) {
        console.warn('Could not remix that effect: its record is missing or failed validation.')
        return
      }
      seedDraft(def, remixSlug(def.name, [...drafts.map((d) => d.slug), ...publishedSlugs]))
    }
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

  // Panel chrome state. Focus on an already-soloed panel brings the room back.
  const [panelsCollapsed, setPanelsCollapsed] = useState<Record<PanelKey, boolean>>({
    setup: false,
    code: false,
    preview: false,
  })
  const togglePanel = (k: PanelKey) => setPanelsCollapsed((c) => ({ ...c, [k]: !c[k] }))
  const focusPanel = (k: PanelKey) =>
    setPanelsCollapsed((c) => {
      const soloed = !c[k] && (Object.keys(c) as PanelKey[]).every((o) => o === k || c[o])
      return soloed
        ? { setup: false, code: false, preview: false }
        : { setup: k !== 'setup', code: k !== 'code', preview: k !== 'preview' }
    })

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:flex-row md:overflow-hidden">
      {/* Meta column. On a phone the preview leads and this sinks below the body. */}
      <PanelChrome
        title="Setup"
        collapsed={panelsCollapsed.setup}
        onToggle={() => togglePanel('setup')}
        onFocus={() => focusPanel('setup')}
        railClassName="order-3 md:order-none"
        expandedClassName={`order-3 space-y-5 md:order-none md:shrink-0 md:overflow-y-auto md:pr-1 ${
          panelsCollapsed.code && panelsCollapsed.preview ? 'md:flex-1' : 'md:w-[280px]'
        }`}
      >
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
            {/* Keyed to the draft: the JSON editor's text is its own source of
                truth while open, so a draft switch must remount it — otherwise
                the old draft's text commits into the new draft. */}
            <ParamBuilder key={current.slug} params={current.params} onChange={(params) => updateDraft({ params })} />
          </>
        )}
      </PanelChrome>

      {/* The shader body. */}
      <PanelChrome
        title="Code"
        collapsed={panelsCollapsed.code}
        onToggle={() => togglePanel('code')}
        onFocus={() => focusPanel('code')}
        railClassName="order-2 md:order-none"
        expandedClassName="order-2 flex min-h-0 flex-col gap-2 md:order-none md:flex-1"
      >
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
      </PanelChrome>

      {/* The proof: the draft on a real image, with its own knobs live. */}
      <PanelChrome
        title="Preview"
        collapsed={panelsCollapsed.preview}
        onToggle={() => togglePanel('preview')}
        onFocus={() => focusPanel('preview')}
        railClassName="order-1 md:order-none"
        expandedClassName={`order-1 space-y-3 md:order-none md:overflow-y-auto md:pl-1 ${
          panelsCollapsed.code ? 'md:flex-1' : 'md:w-[340px] md:shrink-0'
        }`}
      >
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
      </PanelChrome>
    </div>
  )
}
