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
// The desktop growing-column declaration: at md+ the picker fills the sidebar's
// middle region, and CSS requires each nesting level to restate flex/min-h-0
// for the height to reach the scrolling list. On mobile the picker sizes to
// content instead (the list keeps its own max-h scroll).
const fillColumn = 'md:flex md:min-h-0 md:flex-1 md:flex-col'

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
  /** The chosen effect, or null when none is selected (nothing is highlighted). */
  selectedShader: ShaderType | null
  onShaderSelect: (shader: ShaderType) => void
  /** Recently-used effects, most-recent first, surfaced as a section on top. */
  recentShaders: readonly ShaderType[]
  source: Image | null
}

type PickerSection = { id: string; label: string; effects: readonly ShaderType[] }

/**
 * The effect browser: a gallery grouped into families (Tone, Color, Focus, …)
 * so the eye learns the territory once and navigates by kind. Each row is a
 * compact line — a small live sample of the *user's own image* under that
 * effect beside its name and a plain-speech blurb — and clicking it selects the
 * effect. Order and grouping come from the curated catalog, so adding an effect
 * there places it here automatically.
 */
export function EffectPicker({ selectedShader, onShaderSelect, recentShaders, source }: EffectPickerProps) {
  const thumbnails = useEffectThumbnails(source)

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
          {families.length === 0 ? (
            <p className="px-1 py-6 text-center text-xs text-zinc-500">
              No effects match “{query}”
            </p>
          ) : (
          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1 md:max-h-none md:min-h-0 md:flex-1">
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
                <div className="space-y-1">
                  {family.effects.map((shader) => {
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
                            <span className="text-zinc-500">{shaderIcons[shader]}</span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate text-xs font-medium leading-tight ${
                              isSelected ? 'text-white' : 'text-zinc-200'
                            }`}
                          >
                            {shaderLibrary[shader].name}
                          </span>
                          <span className="block truncate text-[10px] leading-tight text-zinc-500">
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
