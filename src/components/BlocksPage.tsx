import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Blocks, ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DraftListPanel } from '@/components/creator/DraftListPanel'
import { PublishedListPanel } from '@/components/creator/PublishedListPanel'
import { EffectMetaForm } from '@/components/creator/EffectMetaForm'
import { OpStackPanel } from '@/components/creator/OpStackPanel'
import { useDraftValidation } from '@/hooks/useDraftValidation'
import { useEffectPreview } from '@/hooks/useEffectPreview'
import { useRecordPublish } from '@/hooks/useRecordPublish'
import { CustomEffectEntry } from '@/hooks/useCustomEffects'
import { AtprotoSession } from '@/hooks/useAtprotoSession'
import { useLuminframeDelete } from '@/hooks/useLuminframeDelete'
import { putEffectRecord } from '@/infrastructure/atproto/effectPublish'
import { parseAtUri } from '@/infrastructure/atproto/luminframeFeed'
import { EFFECT_SLUG_PATTERN, ENV_VERSION, EffectDefinition } from '@/effects-contract'
import { defFromDraft, deleteDraft, loadDrafts, saveDraft, StoredDraft } from '@/lib/effectDrafts'
import { OP_CATALOG } from '@/lib/blocks/catalog'
import { compileBlocks } from '@/lib/blocks/compile'
import { parseShaderSource } from '@/lib/blocks/parse'
import { OpInstance, ShaderSourceDoc } from '@/lib/blocks/types'

const SAVE_DEBOUNCE_MS = 500

/** A compiled draft patch: the doc as source, plus its generated body and params. */
function compiledPatch(doc: ShaderSourceDoc): Partial<StoredDraft> {
  const compiled = compileBlocks(doc)
  return { source: JSON.stringify(doc), body: compiled.body, params: compiled.params }
}

/** A fresh blocks draft: the photo tinted, one knob already public. */
function freshBlocksDraft(existing: readonly StoredDraft[]): StoredDraft {
  let slug = 'new-shader'
  let n = 2
  while (existing.some((d) => d.slug === slug)) slug = `new-shader-${n++}`
  const doc: ShaderSourceDoc = {
    version: 1,
    ops: [{ op: 'sample' }, { op: 'tint', exposed: ['color'] }],
  }
  return {
    slug,
    name: 'New Shader',
    ...(compiledPatch(doc) as Pick<StoredDraft, 'source' | 'body' | 'params'>),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * The chain up to one row, made visible: a color row shows as itself, a
 * value row paints black-to-white (the mask as it is), a position row shows
 * the photo read through it.
 */
function soloDocFor(doc: ShaderSourceDoc, row: number): ShaderSourceDoc {
  const ops = doc.ops.slice(0, row + 1)
  const out = OP_CATALOG[ops[ops.length - 1].op].out
  if (out === 'float') ops.push({ op: 'colorize', knobs: { dark: [0, 0, 0], light: [1, 1, 1] } })
  if (out === 'vec2') ops.push({ op: 'sample', args: { uv: 'current' } })
  return { version: 1, ops }
}

/**
 * The Blocks room: build a shader from small operations — no code — with the
 * whole chain live on a test image. The program is the draft's `source`;
 * every change recompiles it into the same body+params a hand-written GLSL
 * draft carries, so validation, preview, publish, and the editor registry
 * treat the two identically. The GLSL room is the same draft store's expert
 * door (editing code there detaches the blocks).
 */
type BlocksPageProps = {
  session: AtprotoSession
  published: readonly CustomEffectEntry[]
  refreshPublished: () => void
}

export function BlocksPage({ session, published, refreshPublished }: BlocksPageProps) {
  const [drafts, setDrafts] = useState<StoredDraft[]>(() => loadDrafts())
  const sourced = useMemo(() => drafts.filter((d) => d.source), [drafts])
  const [current, setCurrent] = useState<StoredDraft | null>(sourced[0] ?? null)
  const [selectedRow, setSelectedRow] = useState<number | null>(null)
  const [soloRow, setSoloRow] = useState<number | null>(null)

  // Persistence: the CreatorPage idiom — debounced save, rename moves.
  const persistedSlugRef = useRef<string | null>(current?.slug ?? null)
  const persist = useCallback((draft: StoredDraft) => {
    if (!draft.slug) return
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

  const flushPending = useCallback(() => {
    if (pendingSaveRef.current) {
      persist(pendingSaveRef.current)
      pendingSaveRef.current = null
    }
  }, [persist])

  // The program, parsed from the draft it lives in. A doc the grammar refuses
  // (say, a removed row orphaning a tap) keeps its named errors on screen
  // while body/params — and so the preview — hold the last good compile.
  const parsed = useMemo(
    () => (current?.source ? parseShaderSource(JSON.parse(current.source)) : null),
    [current?.source]
  )
  const doc = parsed?.ok ? parsed.doc : null
  const blockErrors = parsed && !parsed.ok ? parsed.errors : []

  const commitDoc = useCallback(
    (nextDoc: ShaderSourceDoc) => {
      const judged = parseShaderSource(nextDoc)
      updateDraft(judged.ok ? compiledPatch(judged.doc) : { source: JSON.stringify(nextDoc) })
    },
    [updateDraft]
  )

  const changeRow = useCallback(
    (index: number, next: OpInstance) => {
      if (!doc) return
      commitDoc({ version: 1, ops: doc.ops.map((op, i) => (i === index ? next : op)) })
    },
    [doc, commitDoc]
  )
  const addOp = useCallback(
    (key: string) => {
      if (!doc) return
      commitDoc({ version: 1, ops: [...doc.ops, { op: key }] })
      setSelectedRow(doc.ops.length)
    },
    [doc, commitDoc]
  )
  const moveOp = useCallback(
    (from: number, to: number) => {
      if (!doc || to < 0 || to >= doc.ops.length) return
      const ops = [...doc.ops]
      const [moved] = ops.splice(from, 1)
      ops.splice(to, 0, moved)
      commitDoc({ version: 1, ops })
      setSelectedRow((sel) => (sel === from ? to : sel === to ? from : sel))
      setSoloRow(null)
    },
    [doc, commitDoc]
  )
  const removeOp = useCallback(
    (index: number) => {
      if (!doc) return
      commitDoc({ version: 1, ops: doc.ops.filter((_, i) => i !== index) })
      setSelectedRow(null)
      setSoloRow(null)
    },
    [doc, commitDoc]
  )

  // What the preview judges and renders: the whole program, or the soloed
  // prefix. Publish always uses the whole draft.
  const publishDef = useMemo(() => (current ? defFromDraft(current) : null), [current])
  const previewDef = useMemo<EffectDefinition | null>(() => {
    if (!current) return null
    if (doc && soloRow !== null && soloRow < doc.ops.length) {
      const compiled = compileBlocks(soloDocFor(doc, soloRow))
      return { name: 'solo', env: ENV_VERSION, params: compiled.params, body: compiled.body }
    }
    return publishDef
  }, [current, doc, soloRow, publishDef])

  const validation = useDraftValidation(previewDef)
  const preview = useEffectPreview()
  const { loadSample } = preview

  useEffect(() => {
    void loadSample()
  }, [loadSample])

  useEffect(() => {
    if (validation.effect && preview.image) {
      preview.showEffect(validation.effect, {})
    }
  }, [validation.effect, preview.image, preview])

  // Publishing: slug is the rkey; a published slug means update-in-place.
  const publishedSourced = useMemo(() => published.filter((e) => e.def.source), [published])
  const publishedSlugs = useMemo(
    () => published.map((e) => parseAtUri(e.key)?.rkey).filter((r): r is string => !!r),
    [published]
  )
  const agent = session.status === 'signed-in' ? session.agent : null
  const { state: publishState, publish, reset: resetPublish } = useRecordPublish(agent, putEffectRecord, refreshPublished)

  const selectDraft = useCallback(
    (slug: string) => {
      flushPending()
      const draft = loadDrafts().find((d) => d.slug === slug)
      if (!draft) return
      setCurrent(draft)
      persistedSlugRef.current = draft.slug
      setSelectedRow(null)
      setSoloRow(null)
      resetPublish()
    },
    [flushPending, resetPublish]
  )

  const newDraft = useCallback(() => {
    const draft = freshBlocksDraft(loadDrafts())
    persistedSlugRef.current = null
    setCurrent(draft)
    setSelectedRow(null)
    setSoloRow(null)
    resetPublish()
    persist(draft)
  }, [persist, resetPublish])

  const removeDraft = useCallback((slug: string) => {
    deleteDraft(slug)
    setDrafts(loadDrafts())
    if (persistedSlugRef.current === slug) {
      pendingSaveRef.current = null
      persistedSlugRef.current = null
      setCurrent(null)
      setSelectedRow(null)
      setSoloRow(null)
    }
  }, [])

  const publishDraft = useCallback(() => {
    if (!current || !publishDef) return
    flushPending()
    void publish(current.slug, publishDef)
  }, [current, publishDef, flushPending, publish])
  const slugPublishable = current ? EFFECT_SLUG_PATTERN.test(current.slug) : false
  const isUpdate = current ? publishedSlugs.includes(current.slug) : false

  const deleteRecord = useLuminframeDelete(agent)
  const editPublished = useCallback(
    (key: string) => {
      const entry = publishedSourced.find((e) => e.key === key)
      const rkey = entry && parseAtUri(entry.key)?.rkey
      if (!entry || !rkey || !entry.def.source) return
      flushPending()
      const draft: StoredDraft = {
        slug: rkey,
        name: entry.def.name,
        ...(entry.def.description ? { description: entry.def.description } : {}),
        params: entry.def.params,
        body: entry.def.body,
        ...(entry.def.animatedBy ? { animatedBy: entry.def.animatedBy } : {}),
        source: entry.def.source,
        updatedAt: new Date().toISOString(),
      }
      saveDraft(draft)
      setDrafts(loadDrafts())
      setCurrent(draft)
      persistedSlugRef.current = rkey
      setSelectedRow(null)
      setSoloRow(null)
      resetPublish()
    },
    [publishedSourced, flushPending, resetPublish]
  )
  const deletePublished = useCallback(
    async (uri: string) => {
      await deleteRecord(uri)
      refreshPublished()
    },
    [deleteRecord, refreshPublished]
  )

  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:flex-row md:overflow-hidden">
      {/* Meta column. On a phone the preview leads and this sinks below the body. */}
      <div className="order-3 space-y-5 md:order-none md:w-[280px] md:shrink-0 md:overflow-y-auto md:pr-1">
        <DraftListPanel
          drafts={sourced}
          selectedSlug={current?.slug ?? null}
          onSelect={selectDraft}
          onNew={newDraft}
          onDelete={removeDraft}
        />
        <PublishedListPanel
          published={publishedSourced.map((e) => ({ key: e.key, name: e.effect.name }))}
          skipped={[]}
          onEdit={editPublished}
          onDelete={deletePublished}
        />
        {current && (
          <EffectMetaForm draft={current} onChange={updateDraft} publishedSlugs={publishedSlugs} />
        )}
      </div>

      {/* The program. */}
      <div className="order-2 flex min-h-0 flex-col gap-3 md:order-none md:flex-1 md:overflow-y-auto md:pr-1">
        {current && doc ? (
          <>
            <OpStackPanel
              doc={doc}
              selectedRow={selectedRow}
              onSelectRow={setSelectedRow}
              soloRow={soloRow}
              onSoloRow={setSoloRow}
              onChangeRow={changeRow}
              onMove={moveOp}
              onRemove={removeOp}
              onAdd={addOp}
            />
            {blockErrors.length > 0 && (
              <div className="space-y-1 text-xs text-red-400">
                {blockErrors.map((e) => (
                  <p key={e}>✗ {e}</p>
                ))}
              </div>
            )}
          </>
        ) : current && blockErrors.length > 0 ? (
          // The stored source itself won't parse (say, from an older build):
          // show why; the compiled body still previews and publishes.
          <div className="space-y-1 text-xs text-red-400">
            {blockErrors.map((e) => (
              <p key={e}>✗ {e}</p>
            ))}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-center">
            <div>
              <Blocks className="mx-auto h-8 w-8 text-zinc-600" />
              <h2 className="mt-3 text-lg font-semibold text-zinc-200">Build a shader</h2>
              <p className="mt-1 max-w-sm text-sm text-zinc-500">
                Stack small blocks — noise, warps, masks, mixes — into a shader of your own. No
                code. It shows itself live, and publishes to your repo when it's ready.
              </p>
              <Button type="button" onClick={newDraft} className="mt-4 bg-violet-600 text-white hover:bg-violet-700">
                Start a shader
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* The proof: the chain on a real image. */}
      <div className="order-1 space-y-3 md:order-none md:w-[340px] md:shrink-0 md:overflow-y-auto md:pl-1">
        <canvas
          ref={preview.canvasRef}
          className="w-full rounded-lg border border-zinc-800/60 bg-black/40"
        />
        {soloRow !== null && (
          <p className="text-xs text-violet-300">
            Previewing up to row {soloRow + 1} — the eye turns it off.
          </p>
        )}
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
        {current && (
          <div className="space-y-2 border-t border-zinc-800/50 pt-3">
            {session.status !== 'signed-in' ? (
              <p className="text-xs text-zinc-500">
                Sign in (top right) to publish this shader to your repo.
              </p>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={publishDraft}
                  disabled={blockErrors.length > 0 || !slugPublishable || publishState.phase === 'publishing'}
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
