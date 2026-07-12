'use client'

import { useCallback, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { HeaderBar } from '@/components/header-bar'
import { CanvasWorkspace } from '@/components/CanvasWorkspace'
import { GalleryPage } from '@/components/GalleryPage'
import { ImagePage } from '@/components/ImagePage'
import { EditorSidebar } from './EditorSidebar'
import { useShaderEditor } from './useShaderEditor'
import { useAtprotoSession } from '@/hooks/useAtprotoSession'
import { usePublish } from '@/hooks/usePublish'
import { useRemix } from '@/hooks/useRemix'
import { useApplyRecipe } from '@/hooks/useApplyRecipe'
import { useLuminframeDelete } from '@/hooks/useLuminframeDelete'
import { serializeRecipe } from '@/lib/shaders/serializeRecipe'
import { isGalleryPath, isImagePath } from '@/lib/galleryRoute'

export function ClientApp(): JSX.Element {
  const session = useAtprotoSession()
  const pathname = useLocation().pathname
  const onGallery = isGalleryPath(pathname)
  const onImage = isImagePath(pathname)
  const onEditor = !onGallery && !onImage
  const {
    canvasRef,
    selectedShader,
    setSelectedShader,
    recentShaders,
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
    handleRemixLoad,
    applyRecipe,
    remixParent,
    handleCanvasResize,
    captureSession,
  } = useShaderEditor()

  // What's recorded on a saved Luminframe record beyond the pixels: the committed
  // effect stack. `effects` is the lightweight name list (display/back-compat);
  // `recipe` is the executable stack with params, serialized to plain JSON (source
  // images dropped). The live draft is excluded — it's what the user applied, not
  // what they're mid-tuning.
  const publishEdit = useMemo(
    () => ({
      effects: appliedEffects.map((e) => e.type),
      recipe: serializeRecipe(appliedEffects),
      remixOf: remixParent ?? undefined,
    }),
    [appliedEffects, remixParent]
  )
  const publish = usePublish(session, canvasRef, publishEdit)

  // "Open in editor" from the gallery is the address /?remix=<at-uri>: this loads
  // that image into the editor as a fresh source (carrying its {uri, cid} so a
  // save records the lineage), wherever it's clicked from.
  useRemix(handleRemixLoad)

  // "Apply this recipe" from the gallery is /?recipe=<at-uri>: bring the saved
  // look (its effect stack) onto the current image, wherever it's clicked from.
  useApplyRecipe(applyRecipe)

  const deleteImage = useLuminframeDelete(session.agent)

  // Persist the in-progress edit before sign-in navigates away to Bluesky, so it
  // restores when the user lands back here. Other session methods pass through.
  const signIn = useCallback(
    async (handle: string) => {
      await captureSession()
      return session.signIn(handle)
    },
    [captureSession, session.signIn]
  )
  const headerSession = useMemo(() => ({ ...session, signIn }), [session, signIn])

  return (
    <div className="flex flex-col min-h-screen bg-[#030305]">
      <HeaderBar session={headerSession} />
      {/* The editor stays mounted (so the WebGL canvas isn't torn down and re-init
          on every visit) — it's just hidden while another view is shown. Which
          view is visible is read from the URL, not local state, so every place is
          a real, bookmarkable address. */}
      <div className={onEditor ? 'flex flex-col md:flex-row flex-1' : 'hidden'}>
        <EditorSidebar
          hasImage={hasImage}
          source={source}
          selectedShader={selectedShader}
          onShaderSelect={setSelectedShader}
          recentShaders={recentShaders}
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

        {/* Main content. On desktop the canvas is pinned in view (sticky,
            self-start so it keeps its own viewport height instead of stretching
            to the taller sidebar) — the subject stays visible while the tools
            scroll past it, so choosing an effect never scrolls the image away. */}
        <div className="relative flex-1 md:sticky md:top-4 md:self-start md:h-[calc(100vh-2rem)]">
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

      {onGallery && <GalleryPage did={session.did} onDeleteImage={deleteImage} />}
      {onImage && <ImagePage viewerDid={session.did} onDeleteImage={deleteImage} />}
    </div>
  )
}
