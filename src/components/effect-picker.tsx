'use client'

import { useCallback, useEffect, useRef } from 'react'
import { ShaderType } from '@/types/shader'
import { Wand2, Grid, SplitSquareHorizontal, Circle, Waves, Flower2, Zap, Sparkles, Cloud, PaintBucket, ImagePlus, Move, Palette, Contrast, Lightbulb, PaintRollerIcon, Aperture, Film, PenTool, Droplets, Coffee, Blend, Sunrise, Sun, Flame, Sunset, Glasses, Orbit, ScanLine, Tornado, Grip, LayoutGrid, Tv, Pencil, Droplet, Gem, Layers, Infinity } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { shaderLibrary } from '@/lib/shaders'
import { effectFamilies, blurbOf } from '@/lib/shaders/catalog'
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
  source: Image | null
}

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
export function EffectPicker({ selectedShader, onShaderSelect, onShaderPreview, source }: EffectPickerProps) {
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

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-zinc-400">Effects</h3>
      <Card className="border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm">
        <CardContent className="p-3">
          <div
            className="max-h-[440px] space-y-4 overflow-y-auto pr-1"
            onMouseLeave={clearPreview}
          >
            {effectFamilies.map((family) => (
              <div key={family.id} className="space-y-2">
                <h4 className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  {family.label}
                </h4>
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
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
