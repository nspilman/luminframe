'use client'

import { useCallback, useMemo, useState } from 'react'
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
import { useEffectRegistry } from '@/hooks/useEffectRegistry'
import { LookEntry, useLookLibrary } from '@/hooks/useLooks'
import { hydrateRecipe } from '@/lib/shaders/hydrateRecipe'
import { SaveLookDialog } from '@/components/SaveLookDialog'
import { parseAtUri } from '@/infrastructure/atproto/luminframeFeed'
import { isCreateLookPath, isCreatePath, isGalleryPath, isImagePath } from '@/lib/galleryRoute'
import { CreatorPage } from '@/components/CreatorPage'
import { ComposePage } from '@/components/ComposePage'
import { CreatorTabs } from '@/components/creator/CreatorTabs'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { staticPageMeta } from '@/lib/pageMeta'

export function ClientApp(): JSX.Element {
  const session = useAtprotoSession()
  const pathname = useLocation().pathname
  const onGallery = isGalleryPath(pathname)
  const onImage = isImagePath(pathname)
  const onCreate = isCreatePath(pathname)
  const onCreateLook = isCreateLookPath(pathname)
  // The editor is the fallback room for any unclaimed path, so every other
  // room must subtract itself here or the editor renders beneath it.
  const onEditor = !onGallery && !onImage && !onCreate

  // Keep share metadata in step with the URL. The shell owns every route except
  // the image page, which refines its own once its record loads — so this defers
  // there (null) rather than overwriting it with a neutral fallback.
  useDocumentMeta(onImage ? null : staticPageMeta(pathname, window.location.origin + pathname))

  // The effect registry: everything resolvable right now — builtins plus the
  // signed-in user's custom effects, loaded from their PDS. Signed out, it's
  // the builtins alone, immediately ready.
  const { registry, custom: customEffects, ready: registryReady, publishedSkipped, refreshPublished } = useEffectRegistry(session.did)

  // The user's Looks — composed effect chains, drafts and published. They live
  // beside the registry, not in it: a Look is data (a chain of effect keys),
  // hydrated against the registry at apply time.
  const lookLibrary = useLookLibrary(session.did)
  const [saveLookOpen, setSaveLookOpen] = useState(false)
  const publishedLookSlugs = useMemo(
    () =>
      lookLibrary.looks
        .filter((l) => l.key.startsWith('at://'))
        .map((l) => parseAtUri(l.key)?.rkey)
        .filter((r): r is string => !!r),
    [lookLibrary.looks]
  )

  const {
    canvasRef,
    selectedShader,
    selectShader,
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
    appendRecipe,
    remixParent,
    handleCanvasResize,
    captureSession,
    encodeAnimatedEdit,
  } = useShaderEditor(registry, registryReady)

  // Clicking a Look in the picker: hydrate its chain against the registry and
  // append it to the stack (one history push — a single undo removes the whole
  // Look). A step whose effect this client can't resolve is dropped by
  // hydrateRecipe; say so rather than silently thinning the chain.
  const onApplyLook = useCallback(
    (look: LookEntry) => {
      const steps = hydrateRecipe(look.def.steps, registry)
      if (steps.length < look.def.steps.length) {
        console.warn(
          `Look "${look.def.name}": ${look.def.steps.length - steps.length} step(s) reference effects this client can't resolve and were skipped.`
        )
      }
      appendRecipe(steps)
    },
    [registry, appendRecipe]
  )

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
  const publish = usePublish(session, canvasRef, publishEdit, encodeAnimatedEdit)

  // "Open in editor" from the gallery is the address /?remix=<at-uri>: this loads
  // that image into the editor as a fresh source (carrying its {uri, cid} so a
  // save records the lineage), wherever it's clicked from.
  useRemix(handleRemixLoad)

  // "Apply this recipe" from the gallery is /?recipe=<at-uri>: bring the saved
  // look (its effect stack) onto the current image, wherever it's clicked from.
  useApplyRecipe(applyRecipe, registry, registryReady)

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
    // On desktop the editor is a workbench: it owns exactly one viewport
    // (h-screen) and its regions scroll internally, so the header, canvas, and
    // Apply never leave view. On a phone — and on the document routes (gallery,
    // image page) — the page scrolls normally; the phone editor keeps its
    // subject present by sticking the canvas to the top instead.
    <div className={`flex min-h-screen flex-col bg-[#030305] ${onEditor || onCreate ? 'md:h-screen md:overflow-hidden' : ''}`}>
      <HeaderBar session={headerSession} />
      {/* The editor stays mounted (so the WebGL canvas isn't torn down and re-init
          on every visit) — it's just hidden while another view is shown. Which
          view is visible is read from the URL, not local state, so every place is
          a real, bookmarkable address. */}
      <div className={onEditor ? 'flex min-h-0 flex-1 flex-col md:flex-row' : 'hidden'}>
        <EditorSidebar
          hasImage={hasImage}
          source={source}
          registry={registry}
          customEffects={customEffects}
          looks={lookLibrary.looks}
          onApplyLook={onApplyLook}
          selectedShader={selectedShader}
          onShaderSelect={selectShader}
          recentShaders={recentShaders}
          effect={effect}
          values={{ ...varValues, resolution }}
          onChange={updateVarValue}
          appliedEffects={appliedEffects}
          onApply={handleApply}
          onUseRenderAsSecondImage={handleSaveAsSecondImage}
          onRemoveEffect={handleRemoveEffect}
          onMoveEffect={handleMoveEffect}
          onSaveLook={() => setSaveLookOpen(true)}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
        />

        {/* Main content. On desktop the workbench shell fixes the canvas region
            in the viewport beside the tools. On a phone the canvas comes first
            (order-1) and stays stuck to the top while the tools scroll beneath
            it — the subject is the constant, the controls pass by. */}
        <div className="sticky top-0 z-10 order-1 min-h-0 md:static md:order-none md:flex-1">
          <div className="h-[45vh] md:h-full">
            <CanvasWorkspace
              ref={canvasRef}
              dimensions={aspectRatioArray}
              hasImage={hasImage}
              sourceUrl={sourceUrl}
              isLoadingImage={isLoadingImage}
              isSignedIn={session.status === 'signed-in'}
              publish={publish}
              onDownload={handleDownload}
              onImageDrop={handleImageDrop}
              onCanvasResize={handleCanvasResize}
            />
          </div>
        </div>
      </div>

      <SaveLookDialog
        open={saveLookOpen}
        onClose={() => setSaveLookOpen(false)}
        appliedEffects={appliedEffects}
        registry={registry}
        session={headerSession}
        publishedLookSlugs={publishedLookSlugs}
        refreshLooks={lookLibrary.refresh}
      />

      {onGallery && <GalleryPage did={session.did} onDeleteImage={deleteImage} />}
      {onImage && <ImagePage viewerDid={session.did} onDeleteImage={deleteImage} />}
      {/* The creator wing mounts and unmounts (unlike the always-mounted
          editor): each room owns its own WebGL surface, and leaving disposes
          it. Two rooms, two addresses — the tabs are navigation. */}
      {onCreate && (
        <div className="flex min-h-0 flex-1 flex-col">
          <CreatorTabs active={onCreateLook ? 'look' : 'effect'} />
          {onCreateLook ? (
            <ComposePage session={headerSession} registry={registry} library={lookLibrary} />
          ) : (
            <CreatorPage
              session={headerSession}
              published={customEffects.filter((e) => e.key.startsWith('at://'))}
              publishedSkipped={publishedSkipped}
              refreshPublished={refreshPublished}
            />
          )}
        </div>
      )}
    </div>
  )
}
