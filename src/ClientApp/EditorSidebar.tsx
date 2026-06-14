import { ShaderEffect, ShaderType, ShaderInputVars } from '@/types/shader'
import { ShaderControls } from './shader-controls'
import { EffectPicker } from '@/components/effect-picker'
import { Card, CardContent } from '@/components/ui/card'

type EditorSidebarProps = {
  selectedShader: ShaderType
  onShaderSelect: (shader: ShaderType) => void
  effect: ShaderEffect
  values: ShaderInputVars
  onChange: (key: keyof ShaderInputVars, value: ShaderInputVars[string]) => void
}

export function EditorSidebar({
  selectedShader,
  onShaderSelect,
  effect,
  values,
  onChange,
}: EditorSidebarProps) {
  return (
    <div className="md:w-[320px] border-b md:border-b-0 md:border-r border-zinc-800/50 bg-black/20 backdrop-blur-xl">
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
