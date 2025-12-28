'use client'

import { useDropzone } from 'react-dropzone'
import { Image } from '@/domain/models/Image'
import { Check, Upload } from 'lucide-react'

interface ImageUploadProps {
  onChange: (image: Image) => void
  hasImage?: boolean
}

export function ImageUpload({ onChange, hasImage = false }: ImageUploadProps) {
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      const file = acceptedFiles[0]
      if (!file) return

      try {
        const image = await Image.fromFile(file)
        onChange(image)
      } catch (error) {
        console.error('Failed to load image:', error)
        // TODO: Show error notification to user
      }
    }
  })

  return (
    <div
      {...getRootProps()}
      className={`w-full h-10 px-3 py-2 rounded-md border transition-all cursor-pointer flex items-center justify-between
        ${hasImage 
          ? 'bg-indigo-500/10 border-indigo-500/50 hover:bg-indigo-500/20 text-indigo-400' 
          : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800/50 text-zinc-400'
        }`}
    >
      <input {...getInputProps()} />
      <span className="text-sm">Choose file or drag and drop</span>
      {hasImage ? (
        <Check className="h-4 w-4 text-indigo-400" />
      ) : (
        <Upload className="h-4 w-4" />
      )}
    </div>
  )
} 