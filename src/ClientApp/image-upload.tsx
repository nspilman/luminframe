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
      className={`w-full h-10 px-3 py-2 border rounded-md cursor-pointer transition-colors flex items-center justify-between
        ${hasImage 
          ? 'bg-primary/10 border-primary hover:bg-primary/20' 
          : 'bg-white border-input hover:bg-accent hover:text-accent-foreground'
        }`}
    >
      <input {...getInputProps()} />
      <span className="text-sm">Choose file or drag and drop</span>
      {hasImage ? (
        <Check className="h-4 w-4 text-primary" />
      ) : (
        <Upload className="h-4 w-4" />
      )}
    </div>
  )
} 