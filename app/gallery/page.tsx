'use client'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { TextureLoader, Mesh } from 'three'
import { useEffect, useState, useRef, Suspense } from 'react'
import * as THREE from 'three'
import './RoundedMaterial'
import './AberratedMaterial'

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
  const opacity = useRef<number>(0)
  const activated = useRef<boolean>(false)
  const localTimer = useRef<number>(0)
  const [visible, setVisible] = useState<boolean>(false)
  const [paused, setPaused] = useState<boolean>(false)
  const hoveredRef = useRef<boolean>(false)
  const aberration = useRef<number>(0)
  const lastFrameTime = useRef<number>(performance.now())

  useEffect(() => {
    const onVisibilityChange = () => {
      lastFrameTime.current = performance.now()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  useFrame(() => {
    const now = performance.now()
    let delta = now - lastFrameTime.current
    lastFrameTime.current = now
    if (delta > 50) delta = 16.67
    if (!document.hidden) localTimer.current += delta

    if (!activated.current && localTimer.current >= delay) {
      activated.current = true
      setVisible(true)
    }

    if (!ref.current) return

    const targetAberration = hoveredRef.current ? 1 : 0
    aberration.current += (targetAberration - aberration.current) * 0.1

    const targetOpacity = visible ? 1 : 0
    opacity.current += (targetOpacity - opacity.current) * 0.1

    const material = ref.current.material as any
    if (material) {
      material.intensity = aberration.current
      material.opacity = opacity.current
    }

    if (activated.current && !paused) {
      position.current[2] += 0.02 * window.__gallerySpeed
      scale.current += (1.5 - scale.current) * 0.02 * window.__gallerySpeed
      ref.current.position.set(...position.current)
      ref.current.scale.setScalar(scale.current)
    }

    if (position.current[2] > 6) {
      position.current[2] = -20 - Math.random() * 10
      position.current[0] = (Math.random() - 0.5) * viewport.width * 1.5
      position.current[1] = (Math.random() - 0.5) * viewport.height * 1.5
      scale.current = 0.5
      opacity.current = 0
      localTimer.current = 0
      activated.current = false
      setVisible(false)
      aberration.current = 0
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
        hoveredRef.current = true
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        setPaused(false)
        hoveredRef.current = false
        document.body.style.cursor = 'default'
      }}
      onClick={(e) => {
        e.stopPropagation()
        onClick(textureUrl)
      }}
    >
      <planeGeometry args={[width, height]} />
      <aberratedMaterial
        transparent
        ref={(mat: THREE.ShaderMaterial | null) => {
          if (ref.current && mat) (ref.current.material as any) = mat
        }}
        map={texture}
        radius={0.15}
        intensity={0}
        opacity={0}
        toneMapped={false}
      />
    </mesh>
  )
}

function SpeedUpdater() {
  const { gl, scene, camera } = useThree()

  useEffect(() => {
    gl.setAnimationLoop(() => {
      gl.render(scene, camera)
    })
  }, [gl, scene, camera])

  return null
}
export default function GalleryPage() {
  const [images, setImages] = useState<string[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [viewportHeight, setViewportHeight] = useState<number>(0)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const updateHeight = () => setViewportHeight(window.innerHeight)
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

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
    let targetSpeed = 3
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

    const isMobile = typeof window !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent)
    const touchMultiplier = isMobile ? 0.08 : 0.01

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartY !== null) {
        const currentY = e.touches[0].clientY
        const deltaY = touchStartY - currentY
        targetSpeed = Math.min(5, Math.max(1, targetSpeed + deltaY * touchMultiplier))
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

    const interval = setInterval(() => {
      const now = performance.now()
      const timeSinceScroll = now - lastScroll
      if (timeSinceScroll > 300) {
        targetSpeed = Math.max(1, targetSpeed - 0.02)
      }
      window.__gallerySpeed += (Math.pow(targetSpeed, 0.8) - window.__gallerySpeed) * 0.05
    }, 1000 / 60)

    return () => {
      clearInterval(interval)
      window.removeEventListener('wheel', handleScroll)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  if (!isClient) return null

  return (
    <div
      style={{
        height: `${viewportHeight}px`,
        width: '100vw',
        background: 'linear-gradient(180deg, #000 0%, #111 50%, #000 100%)',
        position: 'relative',
      }}
    >
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
          {images.map((filename, i) => (
            <FloatingImage
              key={`${filename}-${i}`}
              textureUrl={`/approved/${filename}`}
              delay={i * 2000}
              onClick={(url) => setSelectedImage(url)}
            />
          ))}
        </Suspense>
      </Canvas>

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