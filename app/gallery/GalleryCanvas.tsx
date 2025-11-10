'use client'
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import FloatingImage from './FloatingImage'
import SpeedUpdater from './SpeedUpdater'

interface GalleryCanvasProps {
  images: string[]
  urls: Record<string, { thumb: string; full: string }>
  onSelect: (url: string) => void
}

export default function GalleryCanvas({ images, urls, onSelect }: GalleryCanvasProps) {
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
        {images.map((filename, i) => {
          const entry = urls[filename]
          if (!entry?.thumb) return null
          return (
            <FloatingImage
              key={`${filename}-${i}`}
              textureUrl={entry.thumb}
              delay={i * 2000}
              onClick={() => onSelect(entry.full)}
            />
          )
        })}
      </Suspense>
    </Canvas>
  )
}