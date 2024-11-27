'use client'

import { useDropzone } from 'react-dropzone'
import { Texture, TextureLoader } from "three"
import { Check, Upload } from 'lucide-react'

interface ImageUploadProps {
  onChange: (texture: Texture) => void
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

      const textureLoader = new TextureLoader()
      const img = new Image()
      img.src = URL.createObjectURL(file)
      
      await new Promise((resolve) => {
        img.onload = () => {
          const texture = textureLoader.load(img.src)
          texture.userData = { width: img.width, height: img.height }
          onChange(texture)
          resolve(null)
        }
      })
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