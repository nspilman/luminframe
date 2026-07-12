'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ShaderType } from '@/types/shader'
import { Wand2, Grid, SplitSquareHorizontal, Circle, Waves, Flower2, Zap, Sparkles, Cloud, PaintBucket, ImagePlus, Move, Palette, Contrast, Lightbulb, PaintRollerIcon, Aperture, Film, PenTool, Droplets, Coffee, Blend, Sunrise, Sun, Flame, Sunset, Glasses, Orbit, ScanLine, Tornado, Grip, LayoutGrid, Tv, Pencil, Droplet, Gem, Layers, Infinity, Search, X, ChevronDown, ChevronRight } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { shaderLibrary } from '@/lib/shaders'
import { blurbOf } from '@/lib/shaders/catalog'
import { filterEffectFamilies } from '@/lib/shaders/effectSearch'
import { loadCollapsed, saveCollapsed, toggleCollapsed } from '@/lib/shaders/collapsedFamilies'
import { Image } from '@/domain/models/Image'
import { useEffectThumbnails } from '@/hooks/useEffectThumbnails'

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
  selectedShader: ShaderType
  onShaderSelect: (shader: ShaderType) => void
  /** Preview an effect live on the canvas while the pointer rests on it; null reverts. */
  onShaderPreview: (shader: ShaderType | null) => void
  /** Recently-used effects, most-recent first, surfaced as a section on top. */
  recentShaders: readonly ShaderType[]
  source: Image | null
}

type PickerSection = { id: string; label: string; effects: readonly ShaderType[] }

// A hover settles for this long before it previews, so gliding the pointer
// across tiles on the way to one doesn't strobe the canvas through every effect
// it crosses (the pitfall Lightroom's live-preview hit). Short enough to feel
// immediate once the pointer comes to rest.
const PREVIEW_SETTLE_MS = 60

/**
 * The effect browser: a gallery grouped into families (Tone, Color, Soften, …)
 * so the eye learns the territory once and navigates by kind. Each tile leads
 * with a live preview of the *user's own image* under that effect — the truest
 * answer to "what will this do" — with the name and a plain-speech blurb beneath.
 * Order and grouping come from the curated catalog, so adding an effect there
 * places it here automatically.
 */
export function EffectPicker({ selectedShader, onShaderSelect, onShaderPreview, recentShaders, source }: EffectPickerProps) {
  const thumbnails = useEffectThumbnails(source)

  // Debounce the hover into a preview; keep the latest callback in a ref so the
  // unmount cleanup can revert the preview without re-subscribing on every render.
  const settleTimer = useRef<number | null>(null)
  const previewRef = useRef(onShaderPreview)
  previewRef.current = onShaderPreview

  const schedulePreview = useCallback((shader: ShaderType) => {
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current)
    settleTimer.current = window.setTimeout(() => previewRef.current(shader), PREVIEW_SETTLE_MS)
  }, [])

  const clearPreview = useCallback(() => {
    if (settleTimer.current !== null) {
      window.clearTimeout(settleTimer.current)
      settleTimer.current = null
    }
    previewRef.current(null)
  }, [])

  // Revert any live preview if the picker unmounts mid-hover (e.g. the source is
  // cleared), so a stale effect can't linger as the canvas draft.
  useEffect(() => clearPreview, [clearPreview])

  // Type-to-filter: narrows the families as the query is typed. Empty query
  // shows the full catalog, so search overlays browsing rather than replacing it.
  const [query, setQuery] = useState('')
  const families = useMemo(() => filterEffectFamilies(query), [query])
  const topMatch = families[0]?.effects[0]

  // While browsing (no query), lead with a Recent section so a look the user
  // just used is one click away — recognition over recall for the returning
  // hand. During a search the results stand alone; recents would only be noise.
  const sections = useMemo<PickerSection[]>(() => {
    if (query.trim() === '' && recentShaders.length > 0) {
      return [{ id: 'recent', label: 'Recent', effects: recentShaders }, ...families]
    }
    return families
  }, [query, recentShaders, families])

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
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-zinc-400">Effects</h3>
      <Card className="border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm">
        <CardContent className="space-y-3 p-3">
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
          {families.length === 0 ? (
            <p className="px-1 py-6 text-center text-xs text-zinc-500">
              No effects match “{query}”
            </p>
          ) : (
          <div
            className="max-h-[420px] space-y-4 overflow-y-auto pr-1"
            onMouseLeave={clearPreview}
          >
            {sections.map((family) => {
              const isCollapsed = !isSearching && collapsed.includes(family.id)
              return (
              <div key={family.id} className="space-y-2">
                <button
                  type="button"
                  onClick={() => toggleFamily(family.id)}
                  aria-expanded={!isCollapsed}
                  className="flex w-full items-center gap-1 rounded text-[11px] font-medium uppercase tracking-wide text-zinc-500 transition-colors hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500"
                >
                  {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {family.label}
                </button>
                {!isCollapsed && (
                <div className="grid grid-cols-2 gap-2">
                  {family.effects.map((shader) => {
                    const thumb = thumbnails?.[shader]
                    const isSelected = selectedShader === shader
                    return (
                      <button
                        key={shader}
                        type="button"
                        onClick={() => onShaderSelect(shader)}
                        onMouseEnter={() => schedulePreview(shader)}
                        onFocus={() => schedulePreview(shader)}
                        onBlur={clearPreview}
                        aria-pressed={isSelected}
                        className={`group flex flex-col overflow-hidden rounded-lg border text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500 ${
                          isSelected
                            ? 'border-violet-500 ring-1 ring-violet-500'
                            : 'border-zinc-800/60 hover:border-zinc-600'
                        }`}
                      >
                        <span className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-black/30">
                          {thumb ? (
                            <img src={thumb} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-zinc-500">{shaderIcons[shader]}</span>
                          )}
                        </span>
                        <span className="px-2 py-1.5">
                          <span
                            className={`block text-xs font-medium ${
                              isSelected ? 'text-white' : 'text-zinc-200'
                            }`}
                          >
                            {shaderLibrary[shader].name}
                          </span>
                          <span className="mt-0.5 block text-[10px] leading-tight text-zinc-500">
                            {blurbOf(shader)}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
                )}
              </div>
              )
            })}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
