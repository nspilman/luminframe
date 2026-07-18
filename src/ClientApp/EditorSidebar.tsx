import { ShaderEffect, ShaderType, ShaderInputVars } from '@/types/shader'
import { ShaderControls } from './shader-controls'
import { EffectPicker } from '@/components/effect-picker'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Layers, ArrowUp, ArrowDown, X, Undo2, Redo2 } from 'lucide-react'
import { AppliedEffect } from '@/domain/models/EditPipeline'
import { shaderLibrary } from '@/lib/shaders'
import { Image } from '@/domain/models/Image'

type EditorSidebarProps = {
  hasImage: boolean
  source: Image | null
  selectedShader: ShaderType | null
  onShaderSelect: (shader: ShaderType) => void
  recentShaders: readonly ShaderType[]
  effect: ShaderEffect | null
  values: ShaderInputVars
  onChange: (key: keyof ShaderInputVars, value: ShaderInputVars[string]) => void
  appliedEffects: readonly AppliedEffect[]
  onApply: () => void
  onRemoveEffect: (index: number) => void
  onMoveEffect: (from: number, to: number) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

// order-2: on a phone the canvas comes first and the tools follow beneath it.
const sidebarShell =
  'order-2 md:order-none md:flex md:min-h-0 md:w-[320px] md:flex-col border-b md:border-b-0 md:border-r border-zinc-800/50 bg-black/20 backdrop-blur-xl'

export function EditorSidebar({
  hasImage,
  source,
  selectedShader,
  onShaderSelect,
  recentShaders,
  effect,
  values,
  onChange,
  appliedEffects,
  onApply,
  onRemoveEffect,
  onMoveEffect,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: EditorSidebarProps) {
  // Image-first: the tools have no subject to act on until a source is loaded,
  // so the sidebar doesn't exist yet — the canvas invitation is the whole stage,
  // with no dead tool rack beside it.
  if (!hasImage) {
    return null
  }

  // Three regions, so the commit step can never hide: the effect library owns
  // the sidebar's scrolling middle; the work-in-progress panel (tuning + the
  // applied stack) sits pinned below it, scrolling within itself when tall; and
  // the action row — Apply, undo, redo — is the sidebar's fixed last word.
  return (
    <div className={sidebarShell}>
      <div className="flex min-h-0 flex-col p-4 md:flex-1">
        <EffectPicker
          selectedShader={selectedShader}
          onShaderSelect={onShaderSelect}
          recentShaders={recentShaders}
          source={source}
        />
      </div>

      {/* 45vh keeps the pinned panel from ever squeezing the effect library out
          of its half of the sidebar; taller content scrolls within the panel. */}
      <div className="space-y-4 border-t border-zinc-800/50 p-4 md:max-h-[45vh] md:overflow-y-auto">
        {/* Until an effect is chosen the image shows untouched — so the tuning
            controls only appear once there's something to tune. */}
        {effect ? (
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-zinc-400">Adjustments</h3>
            <Card className="border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm">
              <CardContent className="p-4">
                <ShaderControls effect={effect} values={values} onChange={onChange} />
              </CardContent>
            </Card>
          </div>
        ) : (
          <p className="px-1 text-sm text-zinc-500">
            Pick an effect to start — your image stays untouched until you do.
          </p>
        )}

        {appliedEffects.length > 0 && (
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Layers className="h-4 w-4" />
              Applied
            </h3>
            <Card className="border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm">
              <CardContent className="p-2">
                <ol className="space-y-0.5">
                  {appliedEffects.map((applied, index) => (
                    <li
                      key={index}
                      className="group flex items-center gap-2 rounded px-2 py-1.5 text-sm text-zinc-300 hover:bg-white/5"
                    >
                      <span className="w-4 text-right tabular-nums text-zinc-600">
                        {index + 1}
                      </span>
                      <span className="flex-1 truncate">{shaderLibrary[applied.type].name}</span>
                      <button
                        type="button"
                        onClick={() => onMoveEffect(index, index - 1)}
                        disabled={index === 0}
                        aria-label={`Move ${shaderLibrary[applied.type].name} up`}
                        className="rounded p-1 text-zinc-500 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveEffect(index, index + 1)}
                        disabled={index === appliedEffects.length - 1}
                        aria-label={`Move ${shaderLibrary[applied.type].name} down`}
                        className="rounded p-1 text-zinc-500 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveEffect(index)}
                        aria-label={`Remove ${shaderLibrary[applied.type].name}`}
                        className="rounded p-1 text-zinc-500 hover:text-red-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {(effect || canUndo || canRedo) && (
        <div className="flex items-center gap-2 border-t border-zinc-800/50 p-4">
          {effect && (
            <Button
              type="button"
              onClick={onApply}
              className="flex-1 gap-2 bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Plus className="h-4 w-4" />
              Apply effect
            </Button>
          )}
          {(canUndo || canRedo) && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onUndo}
                disabled={!canUndo}
                aria-label="Undo"
                className="text-zinc-400 hover:bg-white/5 disabled:opacity-30"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onRedo}
                disabled={!canRedo}
                aria-label="Redo"
                className="text-zinc-400 hover:bg-white/5 disabled:opacity-30"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
