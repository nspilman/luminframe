'use client'

import { useState, useCallback } from 'react'
import { useDropzone, FileRejection, DropzoneOptions } from 'react-dropzone'
import { Loader2, Upload } from 'lucide-react'
import { Texture, TextureLoader } from "three"

interface ImageUploadProps {
  onImageUpload: (imageData: Texture, dimensions: { width: number; height: number }) => void
}

export function ImageUpload({ onImageUpload }: ImageUploadProps) {
  const [loading, setLoading] = useState<boolean>(false)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    setLoading(true)
    const file = acceptedFiles[0]
    const reader = new FileReader()
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const result = event.target?.result as string
      const img = new Image()
      img.onload = () => {
        const payload = new TextureLoader().load(result);
        console.log({payload})
        onImageUpload(payload,  { width: img.width, height: img.height })
        setLoading(false)
      }
      img.onerror = () => {
        console.error('Error loading image')
        setLoading(false)
      }
      img.src = result
    }
    reader.onerror = () => {
      console.error('Error reading file')
      setLoading(false)
    }
    reader.readAsDataURL(file)
  }, [onImageUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
    multiple: false
  })

  return (
    <div
      {...getRootProps()}
      className={`
        relative flex items-center justify-center h-12 rounded-md
        transition-colors duration-200 cursor-pointer
        ${isDragActive
          ? 'bg-[#FF6B9C]/10 border border-[#FF6B9C]'
          : 'bg-gray-50 border border-gray-200 hover:border-[#FF6B9C]'
        }
      `}
    >
      <input {...getInputProps()} />
      {loading ? (
        <Loader2 className="h-5 w-5 text-[#FF6B9C] animate-spin" />
      ) : (
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-gray-500" />
          <span className="text-sm text-gray-600">Upload image</span>
        </div>
      )}
    </div>
  )
} 