'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Download } from 'lucide-react'
import { ImageScene } from '../ImageScene'
import { useShader } from '@/hooks/useShader'
import { ImageUpload } from './image-upload'
import { ShaderControls } from './shader-controls'
import { Texture } from 'three'

export function ClientApp(): JSX.Element {
  const [image, setImage] = useState<Texture | null>(null)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [selectedShader, setSelectedShader] = useState<string>('fragment')

  const handleImageUpload = useCallback((imageData: Texture, dimensions: { width: number; height: number }) => {
    setImage(imageData)
    setImageDimensions(dimensions)
  }, [])

  const handleImageRemove = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
    e.stopPropagation()
    setImage(null)
    setImageDimensions(null)
  }

  const handleDownload = useCallback(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    
    const link = document.createElement('a')
    link.download = `processed-image-${selectedShader}.png`
    link.href = canvas.toDataURL('image/png')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [selectedShader])

  const { shader, varValues } = useShader(image)
  const imageLoaded = !!varValues.imageTexture
  console.log({varValues, imageLoaded, image})

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F2F8] to-white flex items-center justify-center p-8">
      <Card className="w-full max-w-[1280px] bg-white/80 backdrop-blur-md shadow-[0_4px_6px_-1px_rgba(14,11,61,0.1)] rounded-3xl">
        <CardContent className="p-8">
          <h2 className="text-4xl font-space-grotesk font-bold text-center mb-8 bg-gradient-to-r from-[#0E0B3D] to-[#9D8DF1] bg-clip-text text-transparent">
            Transform Your Image
          </h2>

          {image && (
            <div className="mb-4">
              <ShaderControls 
                selectedShader={selectedShader}
                onShaderSelect={setSelectedShader}
              />
            </div>
          )}

          <div
            className="relative mx-auto overflow-hidden rounded-2xl shadow-inner"
            style={{
              aspectRatio: imageDimensions ? `${imageDimensions.width} / ${imageDimensions.height}` : undefined,
            }}
          >
            {imageLoaded ? (
              <div className="relative w-full h-full">
                <ImageScene 
                  dimensions={[imageDimensions?.width || 0, imageDimensions?.height || 0]}
                  inputVars={varValues}
                  shader={shader}
                />
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-white/90 hover:bg-[#FF6B9C] hover:text-white
                      min-w-[44px] min-h-[44px] rounded-lg border-2 border-[#FF6B9C]
                      transition-colors duration-150 backdrop-blur-sm"
                    onClick={handleDownload}
                    aria-label="Download processed image"
                  >
                    <Download className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-white/90 hover:bg-[#FF6B9C] hover:text-white
                      min-w-[44px] min-h-[44px] rounded-lg border-2 border-[#FF6B9C]
                      transition-colors duration-150 backdrop-blur-sm"
                    onClick={handleImageRemove}
                    aria-label="Remove image"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ) : (
              <ImageUpload onImageUpload={handleImageUpload} />
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
