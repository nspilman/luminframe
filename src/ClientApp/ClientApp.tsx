'use client'

import { HeaderBar } from '@/components/header-bar'
import { CanvasWorkspace } from '@/components/CanvasWorkspace'
import { EditorSidebar } from './EditorSidebar'
import { useShaderEditor } from './useShaderEditor'
import { useAtprotoSession } from '@/hooks/useAtprotoSession'
import { usePublishToBluesky } from '@/hooks/usePublishToBluesky'

export function ClientApp(): JSX.Element {
  const session = useAtprotoSession()
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
    source,
    sourceUrl,
    isLoadingImage,
    appliedEffects,
    handleApply,
    handleRemoveEffect,
    handleMoveEffect,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    handleSaveAsSecondImage,
    handleDownload,
    handleImageDrop,
    handleCanvasResize,
  } = useShaderEditor()

  const publish = usePublishToBluesky(session, canvasRef)

  return (
    <div className="flex flex-col min-h-screen bg-[#030305]">
      <HeaderBar session={session} />
      <div className="flex flex-col md:flex-row flex-1">
        <EditorSidebar
          hasImage={hasImage}
          source={source}
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
              sourceUrl={sourceUrl}
              isLoadingImage={isLoadingImage}
              isSignedIn={session.status === 'signed-in'}
              publish={publish}
              onSaveAsSecondImage={handleSaveAsSecondImage}
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
