'use client'

import { useDropzone } from 'react-dropzone'
import { Texture, TextureLoader } from "three"

interface ImageUploadProps {
  onChange: (texture: Texture) => void
}

export function ImageUpload({ onChange }: ImageUploadProps) {
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
          console.log({texture})
          onChange(texture)
          resolve(null)
        }
      })
    }
  })

  return (
    <div
      {...getRootProps()}
      className="w-full h-10 px-3 py-2 bg-white border border-input rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground"
    >
      <input {...getInputProps()} />
      <span className="text-sm">Choose file or drag and drop</span>
    </div>
  )
} 