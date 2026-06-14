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
    appliedEffects,
    handleApply,
    handleRemoveEffect,
    handleMoveEffect,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    handleSaveImage,
    handleDownload,
    handleImageDrop,
    handleCanvasResize,
  } = useShaderEditor()

  return (
    <div className="flex flex-col min-h-screen bg-[#030305]">
      <HeaderBar />
      <div className="flex flex-col md:flex-row flex-1">
        <EditorSidebar
          hasImage={hasImage}
          selectedShader={selectedShader}
          onShaderSelect={setSelectedShader}
          effect={effect}
          values={{ ...varValues, resolution }}
          onChange={updateVarValue}
          appliedEffects={appliedEffects}
          onApply={handleApply}
          onRemoveEffect={handleRemoveEffect}
          onMoveEffect={handleMoveEffect}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
        />

        {/* Main Content */}
        <div className="relative flex-1">
          <div className="h-[50vh] md:h-full">
            <CanvasWorkspace
              ref={canvasRef}
              dimensions={aspectRatioArray}
              hasImage={hasImage}
              onSaveImage={handleSaveImage}
              onDownload={handleDownload}
              onImageDrop={handleImageDrop}
              onCanvasResize={handleCanvasResize}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
