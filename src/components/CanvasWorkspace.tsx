'use client'

import { forwardRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { RenderCanvas } from './RenderCanvas'
import { Upload, Save, Download, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dimensions } from '@/domain/value-objects/Dimensions'

interface CanvasWorkspaceProps {
  dimensions: [number, number]
  hasImage: boolean
  sourceUrl: string | null
  onSaveImage: (target: "one" | "two") => void
  onDownload: () => void
  onImageDrop: (file: File) => void
  onCanvasResize?: (dimensions: Dimensions) => void
}

/**
 * Canvas workspace component that displays the shader output.
 * Handles the rendering area and save controls.
 */
export const CanvasWorkspace = forwardRef<HTMLCanvasElement, CanvasWorkspaceProps>(
  ({ dimensions, hasImage, sourceUrl, onSaveImage, onDownload, onImageDrop, onCanvasResize }, ref) => {
    // Press-and-hold the compare button to swap the live render for the
    // untouched source — a glance back at where the edit started.
    const [isComparing, setIsComparing] = useState(false)

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
          <button
            type="button"
            onClick={open}
            className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500"
          >
            <div className="text-center space-y-2">
              <Upload className="w-10 h-10 mx-auto text-zinc-500" />
              <p className="text-lg text-zinc-400">Drop an image here or click to choose</p>
            </div>
          </button>
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
              onClick={onDownload}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={() => onSaveImage("one")}
              variant="secondary"
              className="bg-zinc-900/50 hover:bg-zinc-900/70"
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Source Image
            </Button>
            <Button
              onClick={() => onSaveImage("two")}
              variant="secondary"
              className="bg-zinc-900/50 hover:bg-zinc-900/70"
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Second Image
            </Button>
          </div>
        )}
      </div>
    )
  }
)

CanvasWorkspace.displayName = 'CanvasWorkspace'
