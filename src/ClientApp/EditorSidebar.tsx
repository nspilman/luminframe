import { ShaderEffect, ShaderType, ShaderInputVars } from '@/types/shader'
import { ShaderControls } from './shader-controls'
import { EffectPicker } from '@/components/effect-picker'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ImagePlus, Plus, Layers, ArrowUp, ArrowDown, X, Undo2, Redo2 } from 'lucide-react'
import { AppliedEffect } from '@/domain/models/EditPipeline'
import { shaderLibrary } from '@/lib/shaders'
import { Image } from '@/domain/models/Image'

type EditorSidebarProps = {
  hasImage: boolean
  source: Image | null
  selectedShader: ShaderType
  onShaderSelect: (shader: ShaderType) => void
  onShaderPreview: (shader: ShaderType | null) => void
  effect: ShaderEffect
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

const sidebarShell =
  'md:w-[320px] border-b md:border-b-0 md:border-r border-zinc-800/50 bg-black/20 backdrop-blur-xl'

export function EditorSidebar({
  hasImage,
  source,
  selectedShader,
  onShaderSelect,
  onShaderPreview,
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
  // so they aren't mounted yet — the canvas holds the one invitation to begin.
  if (!hasImage) {
    return (
      <div className={sidebarShell}>
        <div className="p-4 flex items-center gap-3 text-zinc-500">
          <ImagePlus className="h-5 w-5 shrink-0" />
          <p className="text-sm">Load an image to start editing.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={sidebarShell}>
      <div className="p-4 space-y-4 md:space-y-6">
        <EffectPicker
          selectedShader={selectedShader}
          onShaderSelect={onShaderSelect}
          onShaderPreview={onShaderPreview}
          source={source}
        />

        <div className="space-y-1">
          <h3 className="text-sm font-medium text-zinc-400">Adjustments</h3>
          <Card className="border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm">
            <CardContent className="p-4">
              <ShaderControls effect={effect} values={values} onChange={onChange} />
            </CardContent>
          </Card>
        </div>

        <Button
          type="button"
          onClick={onApply}
          className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white"
        >
          <Plus className="h-4 w-4" />
          Apply effect
        </Button>

        {(canUndo || canRedo) && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="Undo"
              className="flex-1 gap-2 text-zinc-400 hover:bg-white/5 disabled:opacity-30"
            >
              <Undo2 className="h-4 w-4" />
              Undo
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onRedo}
              disabled={!canRedo}
              aria-label="Redo"
              className="flex-1 gap-2 text-zinc-400 hover:bg-white/5 disabled:opacity-30"
            >
              <Redo2 className="h-4 w-4" />
              Redo
            </Button>
          </div>
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
    </div>
  )
}
