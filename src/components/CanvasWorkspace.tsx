'use client'

import { forwardRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { RenderCanvas } from './RenderCanvas'
import { Upload, Save, Download, Eye, Send, Sparkles, Shuffle, Images } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingOverlay, Spinner } from '@/components/ui/spinner'
import { Dimensions } from '@/domain/value-objects/Dimensions'
import { PublishDialog } from './PublishDialog'
import { SourcePickerDialog } from './SourcePickerDialog'
import { Publisher } from '@/hooks/usePublish'
import { useSurpriseMe } from '@/hooks/useSurpriseMe'
import { urlToFile } from '@/lib/urlToFile'

// A bundled photo (served same-origin from public/, so the render stays
// exportable) that a newcomer can load in one click — play before committing
// their own image. It flows through the same load door as a drop or a remix.
const SAMPLE_IMAGE_URL = '/pink-car-space-needle4.jpg'

interface CanvasWorkspaceProps {
  dimensions: [number, number]
  hasImage: boolean
  sourceUrl: string | null
  isLoadingImage: boolean
  isSignedIn: boolean
  publish: Publisher
  onSaveAsSecondImage: () => void
  onDownload: () => void
  onImageDrop: (file: File) => void
  onCanvasResize?: (dimensions: Dimensions) => void
}

/**
 * Canvas workspace component that displays the shader output.
 * Handles the rendering area and save controls.
 */
export const CanvasWorkspace = forwardRef<HTMLCanvasElement, CanvasWorkspaceProps>(
  ({ dimensions, hasImage, sourceUrl, isLoadingImage, isSignedIn, publish, onSaveAsSecondImage, onDownload, onImageDrop, onCanvasResize }, ref) => {
    // Press-and-hold the compare button to swap the live render for the
    // untouched source — a glance back at where the edit started.
    const [isComparing, setIsComparing] = useState(false)
    const [publishOpen, setPublishOpen] = useState(false)
    const [loadingSample, setLoadingSample] = useState(false)
    const [pickerOpen, setPickerOpen] = useState(false)
    const [downloading, setDownloading] = useState(false)
    const { surprise, isFinding } = useSurpriseMe()

    // Download can be slow for an animated edit (it renders and encodes a video),
    // so show progress — and yield a frame first so the button paints its loading
    // state before the encode occupies the main thread.
    const handleDownloadClick = async () => {
      setDownloading(true)
      await new Promise((resolve) => setTimeout(resolve, 20))
      try {
        await onDownload()
      } finally {
        setDownloading(false)
      }
    }

    // Load the bundled sample through the same door a drop uses. urlToFile keeps
    // it same-origin so the result stays exportable, just like a real upload.
    const loadSample = async () => {
      setLoadingSample(true)
      const file = await urlToFile(SAMPLE_IMAGE_URL, 'sample')
      if (file) onImageDrop(file)
      setLoadingSample(false)
    }

    // Remix a random network creation; if the network has nothing yet, fall back
    // to the bundled sample so the button never dead-ends.
    const handleSurprise = async () => {
      const found = await surprise()
      if (!found) await loadSample()
    }

    const openPublish = () => {
      // Clear any prior result so the dialog opens on the fresh form.
      publish.reset()
      setPublishOpen(true)
    }

    // The whole workspace is a drop target. noClick keeps clicks free for the
    // action buttons; the empty state opens the file dialog via open().
    const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
      accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
      maxFiles: 1,
      noClick: true,
      noKeyboard: true,
      onDrop: (files) => {
        const file = files[0]
        if (file) onImageDrop(file)
      },
    })

    return (
      <div
        {...getRootProps()}
        className="relative h-full rounded-xl border border-zinc-800/50 bg-black/20 backdrop-blur-sm shadow-2xl overflow-hidden"
      >
        <input {...getInputProps()} />
        <div className="absolute inset-0">
          <RenderCanvas
            ref={ref}
            dimensions={dimensions}
            onCanvasResize={onCanvasResize}
            overlayUrl={isComparing ? sourceUrl : null}
          />
        </div>
        {isDragActive && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl ring-2 ring-inset ring-violet-500 bg-violet-500/10 backdrop-blur-sm pointer-events-none">
            <p className="text-lg font-medium text-violet-200">Drop to load image</p>
          </div>
        )}
        {!hasImage ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
            <div className="max-w-md space-y-6 text-center">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-white">Edit a photo with live looks</h2>
                <p className="text-sm leading-relaxed text-zinc-400">
                  Stack shader effects on any image in real time — then save it to your own
                  repo on the AT&nbsp;Protocol, yours to keep, share, and remix.
                </p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={open}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                >
                  <Upload className="h-4 w-4" />
                  Drop a photo or choose one
                </button>
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-zinc-400">
                  <button
                    type="button"
                    onClick={loadSample}
                    disabled={loadingSample || isFinding}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-violet-300 disabled:opacity-60 focus-visible:text-violet-300 focus-visible:outline-none"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {loadingSample ? 'Loading sample…' : 'Try a sample'}
                  </button>
                  <span className="text-zinc-700">·</span>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    disabled={loadingSample || isFinding}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-violet-300 disabled:opacity-60 focus-visible:text-violet-300 focus-visible:outline-none"
                  >
                    <Images className="h-3.5 w-3.5" />
                    Browse public images
                  </button>
                  <span className="text-zinc-700">·</span>
                  <button
                    type="button"
                    onClick={handleSurprise}
                    disabled={loadingSample || isFinding}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-violet-300 disabled:opacity-60 focus-visible:text-violet-300 focus-visible:outline-none"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    {isFinding ? 'Finding one…' : 'Surprise me'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute top-4 right-4 flex gap-2">
            <Button
              onPointerDown={() => setIsComparing(true)}
              onPointerUp={() => setIsComparing(false)}
              onPointerLeave={() => setIsComparing(false)}
              onPointerCancel={() => setIsComparing(false)}
              variant="secondary"
              aria-label="Hold to compare with original"
              className="bg-zinc-900/50 hover:bg-zinc-900/70 select-none touch-none"
            >
              <Eye className="w-4 h-4 mr-2" />
              {isComparing ? 'Original' : 'Compare'}
            </Button>
            <Button
              onClick={handleDownloadClick}
              disabled={downloading}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {downloading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Rendering…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </>
              )}
            </Button>
            <Button
              onClick={openPublish}
              variant="secondary"
              className="bg-zinc-900/50 hover:bg-zinc-900/70"
            >
              <Send className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button
              onClick={onSaveAsSecondImage}
              variant="secondary"
              className="bg-zinc-900/50 hover:bg-zinc-900/70"
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Second Image
            </Button>
          </div>
        )}
        <PublishDialog
          open={publishOpen}
          onClose={() => setPublishOpen(false)}
          isSignedIn={isSignedIn}
          phase={publish.phase}
          outcomes={publish.outcomes}
          error={publish.error}
          onPublish={publish.publish}
        />
        {pickerOpen && <SourcePickerDialog onClose={() => setPickerOpen(false)} />}
        <LoadingOverlay show={isLoadingImage} label="Loading image…" />
      </div>
    )
  }
)

CanvasWorkspace.displayName = 'CanvasWorkspace'
