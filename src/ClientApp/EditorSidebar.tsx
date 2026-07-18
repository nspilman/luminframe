import { ShaderEffect, ShaderType, ShaderInputVars } from '@/types/shader'
import { ShaderControls } from './shader-controls'
import { EffectPicker } from '@/components/effect-picker'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Layers, ArrowUp, ArrowDown, X, Undo2, Redo2, Save } from 'lucide-react'
import { AppliedEffect } from '@/domain/models/EditPipeline'
import { shaderLibrary } from '@/lib/shaders'
import { SECOND_IMAGE_INPUT } from '@/lib/shaders/constants'
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
  /** Bake the current render into the effect's second-image slot. */
  onUseRenderAsSecondImage: () => void
  onRemoveEffect: (index: number) => void
  onMoveEffect: (from: number, to: number) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

// order-2/order-3: on a phone the canvas comes first and the tool columns
// follow beneath it, library before tuning — the same vertical sequence the
// single column had. On desktop they sit side by side; both columns narrow a
// notch below lg so the canvas keeps workable width on small laptops.
const columnShell =
  'md:order-none md:flex md:min-h-0 md:flex-col border-b md:border-b-0 md:border-r border-zinc-800/50 bg-black/20 backdrop-blur-xl'
const libraryShell = `order-2 md:w-[280px] lg:w-[320px] ${columnShell}`
const tuningShell = `order-3 md:w-[260px] lg:w-72 ${columnShell}`

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
  onUseRenderAsSecondImage,
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

  // The applied stack and the action row live wherever the work-in-progress
  // is: at the tuning column's foot while an effect is selected, at the
  // library's foot otherwise. Defined once, mounted in one place at a time.
  const appliedList = appliedEffects.length > 0 && (
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
  )

  const actionRow = (effect || canUndo || canRedo) && (
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
  )

  // Two sibling columns, so browsing and tuning never fight over one: the
  // library keeps its full height always, and the tuning column exists only
  // while an effect is selected — the canvas concedes the width instead of the
  // library conceding its rows. Clicking effects while one is open is how a
  // look is previewed, so the library must stay browsable mid-tune.
  return (
    <>
      <div className={libraryShell}>
        <div className="flex min-h-0 flex-col p-4 md:flex-1">
          <EffectPicker
            selectedShader={selectedShader}
            onShaderSelect={onShaderSelect}
            recentShaders={recentShaders}
            source={source}
          />
        </div>

        {/* With no effect selected there is no tuning column, so the workflow
            state rests at the library's foot (capped so it can't squeeze the
            library out of its own column). */}
        {!effect && (
          <>
            <div className="space-y-4 border-t border-zinc-800/50 p-4 md:max-h-[45vh] md:overflow-y-auto">
              <p className="px-1 text-sm text-zinc-500">
                Pick an effect to start — your image stays untouched until you do.
              </p>
              {appliedList}
            </div>
            {actionRow}
          </>
        )}
      </div>

      {effect && (
        <div className={tuningShell}>
          <div className="min-h-0 space-y-4 overflow-y-auto p-4 md:flex-1">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-zinc-400">Adjustments — {effect.name}</h3>
              <Card className="border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm">
                <CardContent className="p-4">
                  <ShaderControls effect={effect} values={values} onChange={onChange} />
                  {/* Only the composite effects have a second-image slot; the
                      shortcut that bakes the current render into it lives right
                      beside that slot, not in the global action bar. */}
                  {SECOND_IMAGE_INPUT in effect.inputs && (
                    <button
                      type="button"
                      onClick={onUseRenderAsSecondImage}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-violet-300 focus-visible:text-violet-300 focus-visible:outline-none"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Use current render as the second image
                    </button>
                  )}
                </CardContent>
              </Card>
            </div>
            {appliedList}
          </div>
          {actionRow}
        </div>
      )}
    </>
  )
}
