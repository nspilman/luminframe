'use client'

import { useState, useCallback } from 'react'
import { useDropzone, FileRejection, DropzoneOptions } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Upload, X } from 'lucide-react'
import { ImageScene } from '../ImageScene'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function ClientApp(): JSX.Element {
  const [image, setImage] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [selectedShader, setSelectedShader] = useState<string>('fragment')

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    setLoading(true)
    const file = acceptedFiles[0]
    const reader = new FileReader()
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const result = event.target?.result as string
      const img = new Image()
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height })
        setImage(result)
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
  }, [])

  const dropzoneOptions: DropzoneOptions = {
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
    multiple: false
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone(dropzoneOptions)

  const handleImageRemove = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
    e.stopPropagation()
    setImage(null)
    setImageDimensions(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F2F8] to-white flex items-center justify-center p-8">
      <Card className="w-full max-w-[1280px] bg-white/80 backdrop-blur-md shadow-[0_4px_6px_-1px_rgba(14,11,61,0.1)] rounded-3xl">
        <CardContent className="p-8">
          <h2 className="text-4xl font-space-grotesk font-bold text-center mb-8 bg-gradient-to-r from-[#0E0B3D] to-[#9D8DF1] bg-clip-text text-transparent">
            Transform Your Image
          </h2>

          {image && !loading && (
            <div className="mb-4">
              <Select
                value={selectedShader}
                onValueChange={setSelectedShader}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select effect" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fragment">Wave Effect</SelectItem>
                  <SelectItem value="whiteout">White Out</SelectItem>
                  <SelectItem value="blur">Blur</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div
            className="relative mx-auto overflow-hidden rounded-2xl shadow-inner"
            style={{
              aspectRatio: imageDimensions ? undefined : '16 / 9',
            }}
          >
            {image && !loading ? (
              <div className="relative w-full h-full">
                <ImageScene 
                  uploadedImage={image} 
                  selectedShader={selectedShader}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-[#FF6B9C] hover:text-white
                    min-w-[44px] min-h-[44px] rounded-lg border-2 border-[#FF6B9C]
                    transition-colors duration-150 backdrop-blur-sm"
                  onClick={handleImageRemove}
                  aria-label="Remove image"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`
                  absolute inset-0 flex items-center justify-center
                  transition-all duration-200 cursor-pointer
                  ${isDragActive
                    ? 'bg-[#FF6B9C]/10 border-2 border-dashed border-[#FF6B9C]'
                    : 'hover:bg-[#FF6B9C]/5 border-2 border-dashed border-[#0E0B3D]/30 hover:border-[#FF6B9C]'
                  }
                `}
              >
                <input {...getInputProps()} />

                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div
                      key="loader"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center"
                    >
                      <Loader2 className="h-8 w-8 text-[#FF6B9C] mx-auto animate-spin" />
                      <p className="text-[#0E0B3D] mt-4 font-inter font-normal">
                        Processing your image...
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="upload"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center"
                    >
                      <div className="p-4 rounded-full bg-[#FF6B9C]/10 mb-4 mx-auto w-fit">
                        <Upload className="h-8 w-8 text-[#FF6B9C]" />
                      </div>
                      <p className="text-[#0E0B3D] font-space-grotesk font-medium text-lg">
                        Drop your image here, or click to browse
                      </p>
                      <p className="text-[#0E0B3D]/60 text-sm mt-2 font-inter font-light">
                        Supports JPG, PNG, and WebP
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          <p className="text-center text-[#0E0B3D] font-inter text-sm mt-4">
            Your canvas awaits. Upload an image to begin.
          </p>
        </CardContent>
      </Card>

      {/* Enhanced ambient background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#9D8DF1] opacity-20 blur-[80px]"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-48 -right-48 w-[600px] h-[600px] rounded-full bg-[#FF6B9C] opacity-10 blur-[100px]"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-1/4 -right-24 w-64 h-64 rounded-full bg-[#7CFFC4] opacity-10 blur-[60px]"
          animate={{
            y: [0, 50, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
    </div>
  )
}
