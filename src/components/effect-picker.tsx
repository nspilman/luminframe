'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EffectKey, ShaderType } from '@/types/shader'
import { Wand2, Grid, SplitSquareHorizontal, Circle, Waves, Flower2, Zap, Sparkles, Cloud, PaintBucket, ImagePlus, Move, Palette, Contrast, Lightbulb, PaintRollerIcon, Aperture, Film, PenTool, Droplets, Coffee, Blend, Sunrise, Sun, Flame, Sunset, Glasses, Orbit, ScanLine, Tornado, Grip, LayoutGrid, Tv, Pencil, Droplet, Gem, Layers, Infinity, Type, Search, X, ChevronDown, ChevronRight, Play, FlaskConical } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { shaderLibrary } from '@/lib/shaders'
import { motionOf, EffectMotion } from '@/lib/shaders/animation'
import { blurbOf } from '@/lib/shaders/catalog'
import { filterEffectFamilies, textMatchesQuery } from '@/lib/shaders/effectSearch'
import { loadCollapsed, saveCollapsed, toggleCollapsed } from '@/lib/shaders/collapsedFamilies'
import { Image } from '@/domain/models/Image'
import { useEffectThumbnails } from '@/hooks/useEffectThumbnails'
import { CustomEffectEntry } from '@/hooks/useCustomEffects'
import { NetworkEffectsState } from '@/hooks/useNetworkEffects'
import { parseAtUri } from '@/infrastructure/atproto/luminframeFeed'

// The desktop growing-column declaration: at md+ the picker fills the sidebar's
// middle region, and CSS requires each nesting level to restate flex/min-h-0
// for the height to reach the scrolling list. On mobile the picker sizes to
// content instead (the list keeps its own max-h scroll).
const fillColumn = 'md:flex md:min-h-0 md:flex-1 md:flex-col'

/**
 * Marks an effect's motion on its library card, so "will this move?" is
 * answered at the point of choosing rather than after a download. Derived from
 * motionOf — the same truth the render loop and exporters consult — never a
 * hand-kept list. Bright for effects that animate out of the box, dimmed for
 * ones that can (a parameter turns motion on), absent for stills.
 */
function MotionBadge({ motion }: { motion: EffectMotion }) {
  if (motion === 'still') return null
  const animated = motion === 'animated'
  return (
    <span
      title={animated ? 'Animates' : 'Can animate'}
      className={`shrink-0 pr-1 ${animated ? 'text-violet-400' : 'text-zinc-600'}`}
    >
      <Play className="h-3 w-3" fill={animated ? 'currentColor' : 'none'} />
      <span className="sr-only">{animated ? 'Animates' : 'Can animate'}</span>
    </span>
  )
}

// Fallback glyphs, shown only until the live preview of the user's own image
// finishes rendering for each effect. Once a thumbnail lands, the image is the
// label — the icon was only ever a placeholder for the real thing.
const shaderIcons: Record<ShaderType, React.ReactNode> = {
  colorTint: <Wand2 className="h-5 w-5" />,
  pixelate: <Grid className="h-5 w-5" />,
  rgbSplit: <SplitSquareHorizontal className="h-5 w-5" />,
  vignette: <Circle className="h-5 w-5" />,
  wave: <Waves className="h-5 w-5" />,
  kaleidoscope: <Flower2 className="h-5 w-5" />,
  glitch: <Zap className="h-5 w-5" />,
  neonGlow: <Sparkles className="h-5 w-5" />,
  dream: <Cloud className="h-5 w-5" />,
  blend: <PaintBucket className="h-5 w-5" />,
  lightThresholdSwap: <ImagePlus className="h-5 w-5" />,
  gaussianBlur: <Move className="h-5 w-5" />,
  hueSwap: <Palette className="h-5 w-5" />,
  blackAndWhite: <Contrast className="h-5 w-5" />,
  colorQuantize: <PaintRollerIcon className="h-5 w-5" />,
  luminanceQuantize: <Lightbulb className="h-5 w-5" />,
  sharpen: <Aperture className="h-5 w-5" />,
  filmGrain: <Film className="h-5 w-5" />,
  outline: <PenTool className="h-5 w-5" />,
  textOverlay: <Type className="h-5 w-5" />,
  vibrance: <Droplets className="h-5 w-5" />,
  sepia: <Coffee className="h-5 w-5" />,
  duotone: <Blend className="h-5 w-5" />,
  splitTone: <Sunrise className="h-5 w-5" />,
  bloom: <Sun className="h-5 w-5" />,
  lightLeak: <Flame className="h-5 w-5" />,
  godRays: <Sunset className="h-5 w-5" />,
  chromaticAberration: <Glasses className="h-5 w-5" />,
  lensDistortion: <Orbit className="h-5 w-5" />,
  swirl: <Tornado className="h-5 w-5" />,
  tiltShift: <ScanLine className="h-5 w-5" />,
  halftone: <Grip className="h-5 w-5" />,
  dither: <LayoutGrid className="h-5 w-5" />,
  crt: <Tv className="h-5 w-5" />,
  crossHatch: <Pencil className="h-5 w-5" />,
  liquify: <Droplet className="h-5 w-5" />,
  crystallize: <Gem className="h-5 w-5" />,
  displacement: <Layers className="h-5 w-5" />,
  echo: <Infinity className="h-5 w-5" />,
}

type EffectPickerProps = {
  /** The chosen effect, or null when none is selected (nothing is highlighted). */
  selectedShader: EffectKey | null
  onShaderSelect: (shader: EffectKey) => void
  /** Recently-used effects, most-recent first, surfaced as a section on top. */
  recentShaders: readonly EffectKey[]
  /** The user's own published effects, shown as a Yours section. */
  customEffects: readonly CustomEffectEntry[]
  /** Everyone else's, shown as a section that loads only when asked. */
  networkEffects: NetworkEffectsState
  source: Image | null
}

const NETWORK_SECTION = 'network'

type PickerSection = { id: string; label: string; effects: readonly EffectKey[] }

/** Everything a library card shows about one effect, resolved from its key. */
type EffectRow = {
  name: string
  blurb: string
  icon: React.ReactNode
  motion: EffectMotion
}

/**
 * What the network section says besides its rows: the invitation to load, the
 * wait, and the honest endings.
 *
 * The load is a button rather than something expanding the section triggers,
 * because it is not free — a fetch per author, then a GPU compile per stranger's
 * shader — and a cost the user pays should be a cost the user asked for.
 */
function NetworkSectionNote({
  state,
  shown,
  query,
}: {
  state: NetworkEffectsState
  shown: number
  query: string
}) {
  const note = 'px-1 py-1 text-[11px] text-zinc-500'
  if (state.status === 'idle') {
    return (
      <button
        type="button"
        onClick={state.load}
        className="rounded px-1 py-1 text-left text-[11px] text-violet-400 hover:text-violet-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500"
      >
        Load effects published by others →
      </button>
    )
  }
  if (state.status === 'loading') return <p className={note}>Looking across the network…</p>
  if (shown > 0) {
    // Say plainly when the fan-out was capped. A short list that looks complete
    // is worse than a short list that admits what it left out.
    return state.unreadRepos > 0 ? (
      <p className={note}>{state.unreadRepos} more authors not read</p>
    ) : null
  }
  return (
    <p className={note}>
      {query.trim() !== ''
        ? `Nothing here matches “${query}”`
        : 'Nobody else has published an effect yet.'}
    </p>
  )
}

/**
 * The one bridge from a string key to displayable effect facts. The builtin
 * branch's guarded cast is what lets shaderIcons/effectBlurbs stay total maps
 * over the closed union; the custom branch reads the same facts off the loaded
 * record entry. An unresolvable key (a recent whose custom-effect record is
 * gone) returns null and its card simply isn't drawn — the picker is where
 * stale keys die, which is what keeps unresolvable keys out of the pipeline
 * downstream.
 */
function rowFor(
  key: EffectKey,
  customByKey: ReadonlyMap<EffectKey, CustomEffectEntry>,
  networkKeys: ReadonlySet<EffectKey>,
  handles: Record<string, string>
): EffectRow | null {
  if (key in shaderLibrary) {
    const type = key as ShaderType
    const effect = shaderLibrary[type]
    return { name: effect.name, blurb: blurbOf(type), icon: shaderIcons[type], motion: motionOf(effect) }
  }
  const entry = customByKey.get(key)
  if (entry) {
    // Someone else's effect leads with who made it. The blurb is the row's only
    // second line and it truncates, so the credit goes first: an effect from a
    // stranger should never be able to lose its attribution to a long
    // description. Your own effects need no byline.
    const handle = networkKeys.has(key) ? handles[parseAtUri(key)?.did ?? ''] : undefined
    return {
      name: entry.effect.name,
      blurb: handle
        ? entry.description
          ? `@${handle} · ${entry.description}`
          : `@${handle}`
        : entry.description ?? 'Your custom effect',
      icon: <FlaskConical className="h-5 w-5" />,
      motion: motionOf(entry.effect),
    }
  }
  return null
}

/**
 * The effect browser: a gallery grouped into families (Tone, Color, Focus, …)
 * so the eye learns the territory once and navigates by kind. Each row is a
 * compact line — a small live sample of the *user's own image* under that
 * effect beside its name and a plain-speech blurb — and clicking it selects the
 * effect. Order and grouping come from the curated catalog, so adding an effect
 * there places it here automatically.
 */
export function EffectPicker({ selectedShader, onShaderSelect, recentShaders, customEffects, networkEffects, source }: EffectPickerProps) {
  // You are on the network too, so your own effects come back in its listing.
  // They already have a Yours section; showing them twice would make the
  // network look like it is mostly you.
  const networkOnly = useMemo(() => {
    const yours = new Set(customEffects.map((e) => e.key))
    return networkEffects.entries.filter((e) => !yours.has(e.key))
  }, [customEffects, networkEffects.entries])
  const networkKeys = useMemo(() => new Set(networkOnly.map((e) => e.key)), [networkOnly])

  const customByKey = useMemo(
    () => new Map([...customEffects, ...networkOnly].map((e) => [e.key, e])),
    [customEffects, networkOnly]
  )
  const customShaderMap = useMemo(
    () => Object.fromEntries([...customEffects, ...networkOnly].map((e) => [e.key, e.effect])),
    [customEffects, networkOnly]
  )
  const thumbnails = useEffectThumbnails(source, customShaderMap)

  // Type-to-filter: narrows the families as the query is typed. Empty query
  // shows the full catalog, so search overlays browsing rather than replacing it.
  const [query, setQuery] = useState('')
  const families = useMemo(() => filterEffectFamilies(query), [query])

  // The user's own effects, as a Yours section beside the builtin families —
  // searched by the same rule (name or blurb), with name and blurb coming from
  // the record rather than the catalog.
  const yoursSection = useMemo<PickerSection[]>(() => {
    const matches = customEffects.filter((e) =>
      textMatchesQuery(query, e.effect.name, e.description ?? '')
    )
    return matches.length > 0
      ? [{ id: 'yours', label: 'Yours', effects: matches.map((e) => e.key) }]
      : []
  }, [customEffects, query])

  // Everyone else's effects, in a section that is always present — it is how
  // the user learns there is a network at all — but whose contents arrive only
  // once asked for. Searched by the same rule as Yours; before it has loaded
  // there is simply nothing here to match, which is honest: a search cannot
  // promise to cover records nobody has fetched.
  const networkSection = useMemo<PickerSection[]>(() => {
    const matches = networkOnly.filter((e) =>
      textMatchesQuery(query, e.effect.name, e.description ?? '')
    )
    return [{ id: NETWORK_SECTION, label: 'From the network', effects: matches.map((e) => e.key) }]
  }, [networkOnly, query])

  // Your own effects are few and lead the search results; on Enter the top
  // match is the first effect of whatever the current query shows.
  const topMatch = (yoursSection[0] ?? families[0])?.effects[0]

  // While browsing (no query), lead with a Recent section so a look the user
  // just used is one click away — recognition over recall for the returning
  // hand. During a search the results stand alone; recents would only be noise.
  const sections = useMemo<PickerSection[]>(() => {
    if (query.trim() === '' && recentShaders.length > 0) {
      return [{ id: 'recent', label: 'Recent', effects: recentShaders }, ...yoursSection, ...families, ...networkSection]
    }
    return [...yoursSection, ...families, ...networkSection]
  }, [query, recentShaders, yoursSection, families, networkSection])

  // Collapsible families: the explorer can fold sections they don't use, keeping
  // the picker short. The collapsed set is remembered across visits. Collapse is a
  // browse-mode affordance — a search must never hide a match, so while searching
  // every surviving section stays open regardless of what's remembered.
  const isSearching = query.trim() !== ''
  const [collapsed, setCollapsed] = useState<string[]>(() => loadCollapsed())
  useEffect(() => {
    saveCollapsed(collapsed)
  }, [collapsed])
  const toggleFamily = useCallback((id: string) => {
    setCollapsed((prev) => toggleCollapsed(prev, id))
  }, [])

  // The list shows ~3 of 11 families at rest, so the catalog needs a map: a row
  // of family chips that jump the list to their section (expanding it if the
  // user had folded it — a jump must never land on a closed door).
  const listRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  // The jump is two renders: expand the family, then scroll to it. Holding the
  // destination in state and scrolling from an effect ties the scroll to the
  // commit itself — deferring via rAF instead would silently drop the jump in a
  // backgrounded tab, where rAF never fires.
  const [pendingJump, setPendingJump] = useState<string | null>(null)
  const jumpToFamily = useCallback((id: string) => {
    setCollapsed((prev) => prev.filter((c) => c !== id))
    setPendingJump(id)
  }, [])
  useEffect(() => {
    if (!pendingJump) return
    // Instant, not smooth: a jump across ~2000px of list is clearer landing at
    // once — and smooth scrolling is frame-driven, so it also never completes
    // in a backgrounded tab.
    sectionRefs.current[pendingJump]?.scrollIntoView({ block: 'start' })
    setPendingJump(null)
  }, [pendingJump])

  // "More below" cue: a fade at the list's bottom edge whenever content
  // continues past it, so the catalog never silently ends at the fold.
  const [moreBelow, setMoreBelow] = useState(false)
  const measureMoreBelow = useCallback(() => {
    const el = listRef.current
    if (el) setMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 8)
  }, [])
  useEffect(() => {
    measureMoreBelow()
    window.addEventListener('resize', measureMoreBelow)
    return () => window.removeEventListener('resize', measureMoreBelow)
    // Re-measure whenever the list's content could have changed shape.
  }, [measureMoreBelow, sections, collapsed, query])

  // A keyboard shortcut to the search line: '/' when not already typing, or ⌘/Ctrl-K
  // anywhere — the command-palette reflex, so the search is reachable without the mouse.
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null
      const typing =
        el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || !!el?.isContentEditable
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === '/' && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    // At desktop the picker fills the sidebar's middle region, so its effect
    // list is the one that grows and scrolls. CSS makes every level of the
    // chain repeat the same growing-column declaration to pass the height down,
    // so that declaration is named once here.
    <div className={`space-y-3 ${fillColumn}`}>
      <h3 className="text-sm font-medium text-zinc-400">Effects</h3>
      <Card className={`border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm ${fillColumn}`}>
        <CardContent className={`space-y-3 p-3 ${fillColumn}`}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && topMatch) {
                  onShaderSelect(topMatch)
                } else if (e.key === 'Escape') {
                  if (query) setQuery('')
                  else searchRef.current?.blur()
                }
              }}
              placeholder="Search effects"
              aria-label="Search effects"
              className="w-full rounded-lg border border-zinc-800/60 bg-black/30 py-2 pl-8 pr-8 text-sm text-zinc-200 placeholder:text-zinc-500 focus-visible:border-violet-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  searchRef.current?.focus()
                }}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-500 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* The map of the territory: one chip per family, jumping the list to
              its section. Hidden while searching — the filtered list is short
              and the chips would only restate it. */}
          {!isSearching && (
            <div className="flex flex-wrap gap-1">
              {sections.map((family) => (
                <button
                  key={family.id}
                  type="button"
                  onClick={() => jumpToFamily(family.id)}
                  className="rounded-full border border-zinc-800/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500"
                >
                  {family.label}
                </button>
              ))}
            </div>
          )}
          {/* Every section says its own emptiness — the network section in
              particular, which is drawn even when it has no rows because its
              value is the invitation to go get them. A single "no results"
              message over the whole list used to swallow that invitation at
              exactly the moment it was the only thing that could help. */}
          <div className={`relative ${fillColumn}`}>
          <div
            ref={listRef}
            onScroll={measureMoreBelow}
            className="max-h-[420px] space-y-3 overflow-y-auto pr-1 md:max-h-none md:min-h-0 md:flex-1"
          >
            {sections.map((family) => {
              const isCollapsed = !isSearching && collapsed.includes(family.id)
              return (
              <div
                key={family.id}
                ref={(el) => (sectionRefs.current[family.id] = el)}
                className="space-y-2 scroll-mt-1"
              >
                <button
                  type="button"
                  onClick={() => toggleFamily(family.id)}
                  aria-expanded={!isCollapsed}
                  className="flex w-full items-center gap-1 rounded text-[11px] font-medium uppercase tracking-wide text-zinc-500 transition-colors hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500"
                >
                  {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {family.label}
                </button>
                {!isCollapsed && family.id === NETWORK_SECTION && (
                  <NetworkSectionNote state={networkEffects} shown={family.effects.length} query={query} />
                )}
                {!isCollapsed && (
                <div className="space-y-1">
                  {family.effects.map((shader) => {
                    const row = rowFor(shader, customByKey, networkKeys, networkEffects.handles)
                    if (!row) return null
                    const thumb = thumbnails?.[shader]
                    const isSelected = selectedShader === shader
                    return (
                      <button
                        key={shader}
                        type="button"
                        onClick={() => onShaderSelect(shader)}
                        aria-pressed={isSelected}
                        className={`group flex w-full items-center gap-2.5 rounded-lg border p-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 ${
                          isSelected
                            ? 'border-violet-500 ring-1 ring-violet-500'
                            : 'border-zinc-800/60 hover:border-zinc-600'
                        }`}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-black/30">
                          {thumb ? (
                            <img src={thumb} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-zinc-500">{row.icon}</span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate text-xs font-medium leading-tight ${
                              isSelected ? 'text-white' : 'text-zinc-200'
                            }`}
                          >
                            {row.name}
                          </span>
                          <span className="block truncate text-[10px] leading-tight text-zinc-500">
                            {row.blurb}
                          </span>
                        </span>
                        <MotionBadge motion={row.motion} />
                      </button>
                    )
                  })}
                </div>
                )}
              </div>
              )
            })}
          </div>
          {/* The fold made visible: fades over the last rows while the catalog
              continues past the edge, and vanishes at the true end. */}
          {moreBelow && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/80 to-transparent" />
          )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
