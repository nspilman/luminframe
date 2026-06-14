import { ShaderEffect, ShaderType, ShaderInputVars } from '@/types/shader'
import { ShaderControls } from './shader-controls'
import { EffectPicker } from '@/components/effect-picker'
import { Card, CardContent } from '@/components/ui/card'
import { ImagePlus } from 'lucide-react'

type EditorSidebarProps = {
  hasImage: boolean
  selectedShader: ShaderType
  onShaderSelect: (shader: ShaderType) => void
  effect: ShaderEffect
  values: ShaderInputVars
  onChange: (key: keyof ShaderInputVars, value: ShaderInputVars[string]) => void
}

const sidebarShell =
  'md:w-[320px] border-b md:border-b-0 md:border-r border-zinc-800/50 bg-black/20 backdrop-blur-xl'

export function EditorSidebar({
  hasImage,
  selectedShader,
  onShaderSelect,
  effect,
  values,
  onChange,
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
        <EffectPicker selectedShader={selectedShader} onShaderSelect={onShaderSelect} />

        <div className="space-y-1">
          <h3 className="text-sm font-medium text-zinc-400">Adjustments</h3>
          <Card className="border-zinc-800/50 bg-zinc-900/20 backdrop-blur-sm">
            <CardContent className="p-4">
              <ShaderControls effect={effect} values={values} onChange={onChange} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
