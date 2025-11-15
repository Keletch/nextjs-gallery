'use client'
import { Canvas } from '@react-three/fiber'
import { Suspense, useState, useEffect, useRef, useMemo } from 'react'
import FloatingImage from './FloatingImage'
import SpeedUpdater from './SpeedUpdater'

interface GalleryCanvasProps {
  images: string[]
  urls: Record<string, { thumb: string; full: string }>
  onSelect: (url: string) => void
}

export default function GalleryCanvas({ images, urls, onSelect }: GalleryCanvasProps) {
  const shuffledImages = useMemo(() => {
    const arr = [...images]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }, [images])

  const [activeIndices, setActiveIndices] = useState<number[]>([])
  const baul = useRef<number[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // ✅ Pausar/reanudar interval cuando cambia visibilidad
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pausar interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      } else {
        // Reanudar interval solo si no hay 18 activas
        if (!intervalRef.current && activeIndices.length < 18) {
          startSpawning()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [activeIndices.length])

  const startSpawning = () => {
    intervalRef.current = setInterval(() => {
      setActiveIndices(prev => {
        if (prev.length >= 18 || baul.current.length === 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          return prev
        }
        
        const randomIndex = Math.floor(Math.random() * baul.current.length)
        const nextImage = baul.current.splice(randomIndex, 1)[0]
        
        return [...prev, nextImage]
      })
    }, 1000)
  }

  // ✅ Inicializar baúl
  useEffect(() => {
    baul.current = Array.from({ length: shuffledImages.length }, (_, i) => i)
    startSpawning()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [shuffledImages])

  const handleImageExit = (index: number) => {
    setActiveIndices(prev => {
      const newActive = prev.filter(i => i !== index)
      
      // Devolver al baúl
      baul.current.push(index)
      
      // Solo sacar una nueva si tenemos espacio
      if (newActive.length < 18 && baul.current.length > 0) {
        const randomIndex = Math.floor(Math.random() * baul.current.length)
        const nextImage = baul.current.splice(randomIndex, 1)[0]
        return [...newActive, nextImage]
      }
      
      return newActive
    })
  }

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
        {shuffledImages.map((filename, i) => {
          const entry = urls[filename]
          if (!entry?.thumb) return null
          
          const isActive = activeIndices.includes(i)
          
          return (
            <FloatingImage
              key={filename}
              textureUrl={entry.thumb}
              delay={0}
              onClick={() => onSelect(entry.full)}
              onExit={() => handleImageExit(i)}
              forceHidden={!isActive}
            />
          )
        })}
      </Suspense>
    </Canvas>
  )
}