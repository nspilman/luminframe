'use client'

import { HeaderBar } from '@/components/header-bar'
import { CanvasWorkspace } from '@/components/CanvasWorkspace'
import { EditorSidebar } from './EditorSidebar'
import { useShaderEditor } from './useShaderEditor'

export function ClientApp(): JSX.Element {
  const {
    canvasRef,
    selectedShader,
    setSelectedShader,
    effect,
    varValues,
    resolution,
    updateVarValue,
    aspectRatioArray,
    hasImage,
    handleSaveImage,
    handleCanvasResize,
  } = useShaderEditor()

  return (
    <div className="flex flex-col min-h-screen bg-[#030305]">
      <HeaderBar />
      <div className="flex flex-col md:flex-row flex-1">
        <EditorSidebar
          selectedShader={selectedShader}
          onShaderSelect={setSelectedShader}
          effect={effect}
          values={{ ...varValues, resolution }}
          onChange={updateVarValue}
        />

        {/* Main Content */}
        <div className="relative flex-1 before:absolute before:inset-0 before:bg-gradient-to-r before:from-violet-500/20 before:via-indigo-500/20 before:to-purple-500/20 before:-z-10">
          <div className="relative h-full rounded-lg border border-zinc-800/50 bg-black/20 backdrop-blur-xl before:absolute before:inset-0 before:rounded-lg  before:bg-gradient-to-r before:from-violet-500/20 before:via-indigo-500/20 before:to-purple-500/20 before:-z-10">
            <div className="h-[50vh] md:h-full">
              <CanvasWorkspace
                ref={canvasRef}
                dimensions={aspectRatioArray}
                hasImage={hasImage}
                onSaveImage={handleSaveImage}
                onCanvasResize={handleCanvasResize}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
