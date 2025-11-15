'use client'
import { Canvas } from '@react-three/fiber'
import { Suspense, useState, useCallback, useEffect } from 'react'
import FloatingImage from './FloatingImage'
import SpeedUpdater from './SpeedUpdater'

interface GalleryCanvasProps {
  images: string[]
  urls: Record<string, { thumb: string; full: string }>
  onSelect: (url: string) => void
}

export default function GalleryCanvas({ images, urls, onSelect }: GalleryCanvasProps) {
  const [usedImages, setUsedImages] = useState<Set<string>>(new Set())
  const [activeImages, setActiveImages] = useState<string[]>([])

  // ✅ Inicializar con 18 aleatorias solo al montar
  useEffect(() => {
    const arr = [...images]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    const initial = arr.slice(0, Math.min(18, arr.length))
    setActiveImages(initial)
    setUsedImages(new Set(initial))
  }, [images])

  // ✅ Cuando una imagen sale, reemplázala por una nueva
  const handleImageExit = useCallback((exitedImage: string) => {
    setActiveImages(prev => {
      // Buscar imágenes no usadas
      const unused = images.filter(img => 
        !usedImages.has(img) && !prev.includes(img)
      )
      
      // Si hay imágenes sin usar, toma una random
      if (unused.length > 0) {
        const randomIndex = Math.floor(Math.random() * unused.length)
        const newImage = unused[randomIndex]
        
        setUsedImages(current => new Set(current).add(newImage))
        
        // Reemplaza la que salió
        return prev.map(img => img === exitedImage ? newImage : img)
      }
      
      // Si ya usamos todas, resetea
      if (unused.length === 0 && images.length > 18) {
        setUsedImages(new Set(prev))
      }
      
      return prev
    })
  }, [images, usedImages])

  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 60 }}
      shadows
      frameloop="always"
      gl={{ powerPreference: 'high-performance' }}
    >
      <SpeedUpdater />
      <ambientLight intensity={0.2} />
      <hemisphereLight intensity={0.5} groundColor={'#222'} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow color={'#ffddaa'} />
      <Suspense fallback={null}>
        {activeImages.map((filename, i) => {
          const entry = urls[filename]
          if (!entry?.thumb) return null
          return (
            <FloatingImage
              key={`${filename}-${i}`}
              textureUrl={entry.thumb}
              delay={i * 2000}
              onClick={() => onSelect(entry.full)}
              onExit={() => handleImageExit(filename)}
            />
          )
        })}
      </Suspense>
    </Canvas>
  )
}