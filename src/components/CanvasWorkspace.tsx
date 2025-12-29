'use client'

import { forwardRef } from 'react'
import { RenderCanvas } from './RenderCanvas'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'
import { Dimensions } from '@/domain/value-objects/Dimensions'

interface CanvasWorkspaceProps {
  dimensions: [number, number]
  hasImage: boolean
  onSaveImage: (target: "one" | "two") => void
  onCanvasResize?: (dimensions: Dimensions) => void
}

/**
 * Canvas workspace component that displays the shader output.
 * Handles the rendering area and save controls.
 */
export const CanvasWorkspace = forwardRef<HTMLCanvasElement, CanvasWorkspaceProps>(
  ({ dimensions, hasImage, onSaveImage, onCanvasResize }, ref) => {
    return (
      <div className="relative h-full rounded-xl border border-zinc-800/50 bg-black/20 backdrop-blur-sm shadow-2xl overflow-hidden">
        <div className="absolute inset-0">
          <RenderCanvas
            ref={ref}
            dimensions={dimensions}
            onCanvasResize={onCanvasResize}
          />
        </div>
        {!hasImage ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="text-center space-y-2">
              <Upload className="w-10 h-10 mx-auto text-zinc-500" />
              <p className="text-lg text-zinc-400">Add an image to the left to begin</p>
            </div>
          </div>
        ) : (
          <div className="absolute top-4 right-4 flex gap-2">
            <Button
              onClick={() => onSaveImage("one")}
              variant="secondary"
              className="bg-zinc-900/50 hover:bg-zinc-900/70"
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Input
            </Button>
            <Button
              onClick={() => onSaveImage("two")}
              variant="secondary"
              className="bg-zinc-900/50 hover:bg-zinc-900/70"
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Second Input
            </Button>
          </div>
        )}
      </div>
    )
  }
)

CanvasWorkspace.displayName = 'CanvasWorkspace'
