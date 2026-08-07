import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EffectKey, EffectRegistry, ShaderEffect, ShaderInputVars } from '@/types/shader'
import { ShaderControls } from './shader-controls'
import { EffectPicker } from '@/components/effect-picker'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Check, Layers, ArrowUp, ArrowDown, X, Undo2, Redo2, Save, GitFork, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { MinimizeButton, PanelRail } from '@/components/ui/panel-chrome'
import { AppliedEffect } from '@/domain/models/EditPipeline'
import { CustomEffectEntry } from '@/hooks/useCustomEffects'
import { NetworkEffectsState } from '@/hooks/useNetworkEffects'
import { SECOND_IMAGE_INPUT } from '@/lib/shaders/constants'
import { creatorRemixEffectPath } from '@/lib/galleryRoute'
import { Image } from '@/domain/models/Image'

type EditorSidebarProps = {
  /** The photo being edited, or null before one is loaded — the sidebar's subject. */
  source: Image | null
  selectedShader: EffectKey | null
  onShaderSelect: (shader: EffectKey) => void
  recentShaders: readonly EffectKey[]
  /** Every effect resolvable right now — builtins plus loaded custom effects. */
  registry: EffectRegistry
  /** The user's own published effects, for the picker's Yours section. */
  customEffects: readonly CustomEffectEntry[]
  /** Everyone else's, for the picker's network section. */
  networkEffects: NetworkEffectsState
  effect: ShaderEffect | null
  values: ShaderInputVars
  onChange: (key: keyof ShaderInputVars, value: ShaderInputVars[string]) => void
  appliedEffects: readonly AppliedEffect[]
  /** Which applied effect the live draft is revising, or null for a new one. */
  editingIndex: number | null
  /** Open a committed effect for retuning, in its place in the chain. */
  onEditEffect: (index: number) => void
  /** Leave a revision without committing it. */
  onCancelEdit: () => void
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

// One tool column, narrowing a notch below lg so the canvas keeps workable
// width on small laptops. On a phone the canvas comes first (order-2 puts the
// column beneath it).
// backdrop-blur is md-only on purpose: backdrop-filter makes an element a
// containing block for its fixed descendants, and the tuning sheet below md is
// a fixed child of this column that must anchor to the viewport, not to here.
const toolColumn =
  'order-2 md:order-none md:flex md:min-h-0 md:flex-col md:w-[280px] lg:w-[320px] border-b md:border-b-0 md:border-r border-zinc-800/50 bg-black/20 md:backdrop-blur-xl'

// Tuning is the column's second face at desktop — it replaces the library
// rather than standing beside it, so there is one place to look and the canvas
// keeps the width a second column would have taken. On a phone it stays a
// bottom sheet floating over the canvas: selecting an effect must answer on
// screen, not two scrolls down the page the library sits on.
const tuningFace =
  'fixed inset-x-0 bottom-0 z-40 flex max-h-[70vh] flex-col rounded-t-2xl border-t border-zinc-800/50 bg-zinc-950/95 ' +
  'md:static md:z-auto md:max-h-none md:min-h-0 md:flex-1 md:rounded-none md:border-t-0 md:bg-transparent'

export function EditorSidebar({
  source,
  registry,
  customEffects,
  networkEffects,
  selectedShader,
  onShaderSelect,
  recentShaders,
  effect,
  values,
  onChange,
  appliedEffects,
  editingIndex,
  onEditEffect,
  onCancelEdit,
  onApply,
  onUseRenderAsSecondImage,
  onRemoveEffect,
  onMoveEffect,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: EditorSidebarProps) {
  // Desktop-only panel chrome: the tool column minimizes to a slim rail,
  // conceding its width to the canvas — the editor's version of the creator's
  // focus mode. A phone doesn't need it: the canvas already leads there, and
  // the tuning sheet has its own close button. Collapse is CSS (md:!hidden),
  // not unmount, so the picker's search and scroll state survive.
  // `applied` is the odd one out and deliberately so: it's a section inside a
  // column, not a column itself, so it collapses in place to its own header
  // (the picker's family idiom) at every width — a rail would be a lie about
  // what it is, and on a phone a long stack is exactly what needs folding.
  const [collapsed, setCollapsed] = useState({ column: false, applied: false })

  // The selected effect, when it is somebody else's: a published record
  // (at://) that isn't among the user's own. Deliberately not "is it in the
  // network list" — an effect resolved from a shared image's recipe is just as
  // much someone else's work, and just as remixable. A builtin has no record to
  // remix, and your own already opens with the pencil in the creator.
  const remixableKey =
    selectedShader?.startsWith('at://') && !customEffects.some((e) => e.key === selectedShader)
      ? selectedShader
      : null

  // Image-first: the tools have no subject to act on until a source is loaded,
  // so the sidebar doesn't exist yet — the canvas invitation is the whole stage,
  // with no dead tool rack beside it. The photo itself is the door's condition,
  // not a boolean beside it, so "we have an image" and "here it is" can never
  // disagree.
  if (!source) {
    return null
  }

  // The column shows one of two faces: the library, or the knobs of the effect
  // just chosen from it. One place to look, and the canvas keeps the width a
  // second column would have taken.
  const tuning = effect && selectedShader ? { effect, key: selectedShader } : null

  const expandColumn = () => setCollapsed((c) => ({ ...c, column: false }))
  const minimizeColumn = () => setCollapsed((c) => ({ ...c, column: true }))

  // The shared motif, skinned for this surface: the rail is a flush strip
  // against the canvas, and both halves are desktop-only. It is named for the
  // face it will restore, so folding the column never loses your place.
  const minimizeButton = (
    <MinimizeButton label={tuning ? tuning.effect.name : 'Library'} onMinimize={minimizeColumn} className="hidden md:block" />
  )

  // The applied stack and the action row live wherever the work-in-progress
  // is: at the tuning face's foot while an effect is selected, at the
  // library's foot otherwise. Defined once, mounted in one place at a time.
  // Signing out empties the custom half of the registry while the pipeline may
  // still hold an applied custom effect, so an unresolvable key is a real state
  // here: fall back to showing the raw key.
  const nameOf = (key: EffectKey) => registry[key]?.name ?? key

  const appliedList = appliedEffects.length > 0 && (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setCollapsed((c) => ({ ...c, applied: !c.applied }))}
        aria-expanded={!collapsed.applied}
        className="flex w-full items-center gap-2 rounded text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500"
      >
        <Layers className="h-4 w-4" />
        Applied
        {/* The count carries the folded stack: collapsed, it's all that's left
            to say how much work is stacked up. */}
        <span className="tabular-nums text-zinc-600">{appliedEffects.length}</span>
        {collapsed.applied ? (
          <ChevronRight className="ml-auto h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="ml-auto h-3.5 w-3.5" />
        )}
      </button>
      <Card className={`border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm ${collapsed.applied ? 'hidden' : ''}`}>
        <CardContent className="p-2">
          <ol className="space-y-0.5">
            {appliedEffects.map((applied, index) => (
              <li
                key={index}
                className={`group flex items-center gap-2 rounded px-2 py-1.5 text-sm text-zinc-300 hover:bg-white/5 ${
                  editingIndex === index ? 'bg-violet-500/10 ring-1 ring-violet-500/40' : ''
                }`}
              >
                <span className="w-4 text-right tabular-nums text-zinc-600">
                  {index + 1}
                </span>
                {/* The name is the way back in. A committed effect is not
                    finished, just resting — clicking it reopens its knobs
                    where it stands in the chain, with the steps above it
                    still folded on top so you tune it in its real context. */}
                <button
                  type="button"
                  onClick={() => onEditEffect(index)}
                  aria-label={`Edit ${nameOf(applied.type)}`}
                  className="flex-1 truncate text-left transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none"
                >
                  {nameOf(applied.type)}
                </button>
                <button
                  type="button"
                  onClick={() => onMoveEffect(index, index - 1)}
                  disabled={index === 0}
                  aria-label={`Move ${nameOf(applied.type)} up`}
                  className="rounded p-1 text-zinc-500 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onMoveEffect(index, index + 1)}
                  disabled={index === appliedEffects.length - 1}
                  aria-label={`Move ${nameOf(applied.type)} down`}
                  className="rounded p-1 text-zinc-500 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveEffect(index)}
                  aria-label={`Remove ${nameOf(applied.type)}`}
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
          {editingIndex !== null ? (
            <>
              <Check className="h-4 w-4" />
              Update effect
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Apply effect
            </>
          )}
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

  // One column, two faces. Picking an effect turns the page from the library
  // to that effect's knobs; Back turns it home. The library keeps its search
  // and scroll state across the turn (it is hidden, not unmounted), so coming
  // back lands you where you left rather than at the top of the catalog.
  return (
    <>
      {collapsed.column && (
        <PanelRail
          label={tuning ? tuning.effect.name : 'Library'}
          onExpand={expandColumn}
          className="hidden w-9 shrink-0 flex-col border-r border-zinc-800/50 bg-black/20 py-3 backdrop-blur-xl md:flex"
        />
      )}
      <div className={`relative ${toolColumn} ${collapsed.column ? 'md:!hidden' : ''}`}>
        {/* Face one: the library. At desktop the tuning face replaces it; on a
            phone it stays put beneath the canvas and the sheet floats over. */}
        <div className={`flex min-h-0 flex-col p-4 md:flex-1 ${tuning ? 'md:hidden' : ''}`}>
          <div className="absolute right-2 top-4 z-10">{!tuning && minimizeButton}</div>
          <EffectPicker
            selectedShader={selectedShader}
            onShaderSelect={onShaderSelect}
            recentShaders={recentShaders}
            customEffects={customEffects}
            networkEffects={networkEffects}
            source={source}
          />
        </div>

        {/* With no effect selected there is no tuning face, so the workflow
            state rests at the library's foot (capped so it can't squeeze the
            library out of its own column). */}
        {!tuning && (
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

        {/* Face two: the chosen effect's knobs. `tuning` pairs the effect with
            its key, so the way back is one fact rather than two nullable ones
            each handler would have to re-guard. */}
        {tuning && (
          <div className={tuningFace}>
            {/* The way back, at every width: on a phone this is the sheet's
                header, on desktop the page-turn control. Leaving means
                dropping the draft either way — for a new effect that is
                deselecting it, for a revision it is abandoning the retune and
                letting the committed values stand. */}
            <div className="flex items-center justify-between border-b border-zinc-800/50 px-4 py-3">
              <button
                type="button"
                onClick={() => (editingIndex !== null ? onCancelEdit() : onShaderSelect(tuning.key))}
                className="-ml-1 flex min-w-0 items-center gap-1 rounded py-0.5 pl-1 pr-2 text-sm font-medium text-zinc-200 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500"
              >
                <ChevronLeft className="h-4 w-4 shrink-0 text-zinc-500" />
                <span className="truncate">{tuning.effect.name}</span>
              </button>
              <div className="flex items-center gap-2">
                {/* Which of the two things this face is doing. Without it the
                    knobs look identical whether they will add a step or
                    revise one, and only the button at the foot says which. */}
                {editingIndex !== null && (
                  <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-violet-300">
                    Step {editingIndex + 1}
                  </span>
                )}
                {minimizeButton}
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <Card className="border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm">
                <CardContent className="p-4">
                  <ShaderControls effect={tuning.effect} values={values} onChange={onChange} />
                  {/* Only the composite effects have a second-image slot; the
                      shortcut that bakes the current render into it lives right
                      beside that slot, not in the global action bar. */}
                  {SECOND_IMAGE_INPUT in tuning.effect.inputs && (
                    <button
                      type="button"
                      onClick={onUseRenderAsSecondImage}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-violet-300 focus-visible:text-violet-300 focus-visible:outline-none"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Use current render as the second image
                    </button>
                  )}
                  {/* Someone else's effect can be taken apart. Offered here
                      rather than on the library row because the row's gesture
                      is "put this on my image" and this one leaves for another
                      room — you ask it after you've seen the effect work, which
                      is exactly when you're standing in front of its knobs. */}
                  {remixableKey && (
                    <Link
                      to={creatorRemixEffectPath(remixableKey)}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-violet-300 focus-visible:text-violet-300 focus-visible:outline-none"
                    >
                      <GitFork className="h-3.5 w-3.5" />
                      Remix this effect
                    </Link>
                  )}
                </CardContent>
              </Card>
              {appliedList}
            </div>
            {actionRow}
          </div>
        )}
      </div>
    </>
  )
}
