'use client'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { TextureLoader, Mesh } from 'three'
import { useEffect, useState, useRef, Suspense } from 'react'

interface FloatingImageProps {
  textureUrl: string
  delay: number
  onClick: (url: string) => void
}

declare global {
  interface Window {
    __gallerySpeed: number
  }
}

function FloatingImage({ textureUrl, delay, onClick }: FloatingImageProps) {
  const texture = useLoader(TextureLoader, textureUrl)
  const ref = useRef<Mesh>(null)
  const { viewport } = useThree()

  const initialZ = -30 - Math.random() * 20
  const initialX = (Math.random() - 0.5) * viewport.width * 2.5
  const initialY = (Math.random() - 0.5) * viewport.height * 2.5

  const position = useRef<[number, number, number]>([initialX, initialY, initialZ])
  const scale = useRef<number>(0.5)
  const activated = useRef<boolean>(false)
  const activationTime = useRef<number>(performance.now() + delay)

  const [visible, setVisible] = useState<boolean>(false)
  const [paused, setPaused] = useState<boolean>(false)
  const [hovered, setHovered] = useState<boolean>(false)

  useFrame(() => {
    const now = performance.now()
    if (!activated.current && now >= activationTime.current) {
      activated.current = true
      setVisible(true)
    }

    if (!activated.current || !ref.current || paused) return

    position.current[2] += 0.02 * window.__gallerySpeed
    scale.current = Math.min(1.5, scale.current + 0.005 * window.__gallerySpeed)

    ref.current.position.set(...position.current)
    ref.current.scale.setScalar(scale.current)

    if (position.current[2] > 6) {
      position.current[2] = -20 - Math.random() * 10
      position.current[0] = (Math.random() - 0.5) * viewport.width * 1.5
      position.current[1] = (Math.random() - 0.5) * viewport.height * 1.5
      scale.current = 0.5
      activationTime.current = performance.now() + delay
      activated.current = false
      setVisible(false)
    }
  })

  const aspect = texture.image.width / texture.image.height
  const height = 1.5
  const width = height * aspect

  if (!visible) return null

  return (
    <mesh
      ref={ref}
      onPointerOver={(e) => {
        e.stopPropagation()
        setPaused(true)
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        setPaused(false)
        setHovered(false)
        document.body.style.cursor = 'default'
      }}
      onClick={(e) => {
        e.stopPropagation()
        onClick(textureUrl)
      }}
    >
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        map={texture}
        toneMapped={false}
      />
    </mesh>
  )
}

export default function GalleryPage() {
  const [images, setImages] = useState<string[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    const fetchGallery = async () => {
      const resImages = await fetch('/api/approved-index')
      const list = await resImages.json()
      const validList = Array.isArray(list)
        ? list.filter((f: unknown): f is string => typeof f === 'string' && f.trim() !== '')
        : []
      setImages(validList)
    }

    fetchGallery()

    window.__gallerySpeed = 1
    let targetSpeed = 1
    let lastScroll = performance.now()
    let touchStartY: number | null = null

    const handleScroll = (e: WheelEvent) => {
      const delta = e.deltaY
      targetSpeed = Math.min(5, Math.max(1, targetSpeed + delta * 0.01))
      lastScroll = performance.now()
    }

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartY !== null) {
        const currentY = e.touches[0].clientY
        const deltaY = touchStartY - currentY
        targetSpeed = Math.min(5, Math.max(1, targetSpeed + deltaY * 0.01))
        lastScroll = performance.now()
        touchStartY = currentY
      }
    }

    const handleTouchEnd = () => {
      touchStartY = null
    }

    window.addEventListener('wheel', handleScroll, { passive: true })
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })

    const smoothSpeed = () => {
      const now = performance.now()
      const timeSinceScroll = now - lastScroll
      if (timeSinceScroll > 300) {
        targetSpeed = Math.max(1, targetSpeed - 0.02)
      }
      window.__gallerySpeed += (targetSpeed - window.__gallerySpeed) * 0.05
      requestAnimationFrame(smoothSpeed)
    }

    smoothSpeed()

    return () => {
      window.removeEventListener('wheel', handleScroll)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        background: 'linear-gradient(180deg, #000 0%, #111 50%, #000 100%)', // 🌌 gradiente
        position: 'relative',
      }}
    >
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }} shadows>
        {/* 💡 luces más ricas */}
        <ambientLight intensity={0.3} />
        <hemisphereLight intensity={0.6} groundColor={'#222'} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow color={'#ffddaa'} />
        <Suspense fallback={null}>
          {images.map((filename, i) => (
            <FloatingImage
              key={`${filename}-${i}`}
              textureUrl={`/approved/${filename}`}
              delay={i * 1500}
              onClick={(url) => setSelectedImage(url)}
            />
          ))}
        </Suspense>
      </Canvas>

      {/* Overlay fullscreen con animación */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            cursor: 'zoom-out',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <img
            src={selectedImage}
            alt="fullscreen"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: '12px',
              transform: 'scale(1)',
              animation: 'zoomIn 0.3s ease',
            }}
          />
          <style jsx global>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }
            @keyframes zoomIn {
              from {
                transform: scale(0.8);
              }
                            to {
                transform: scale(1);
              }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}
               