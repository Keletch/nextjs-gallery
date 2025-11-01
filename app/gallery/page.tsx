'use client'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { TextureLoader } from 'three'
import { useEffect, useState, useRef, Suspense } from 'react'

function FloatingImage({ textureUrl, delay }) {
  const texture = useLoader(TextureLoader, textureUrl)
  const ref = useRef<any>()
  const { viewport } = useThree()

  const initialZ = -30 - Math.random() * 20
  const initialX = (Math.random() - 0.5) * viewport.width * 2.5
  const initialY = (Math.random() - 0.5) * viewport.height * 2.5

  const position = useRef([initialX, initialY, initialZ])
  const scale = useRef(0.5)
  const activated = useRef(false)
  const activationTime = useRef(performance.now() + delay)

  useFrame(({ clock }) => {
    if (!ref.current) return

    const now = performance.now()
    if (!activated.current && now >= activationTime.current) {
      activated.current = true
    }

    if (!activated.current) return

    // Movimiento hacia la cámara
    position.current[2] += 0.02 * window.__gallerySpeed
    scale.current = Math.min(1.5, scale.current + 0.005 * window.__gallerySpeed)

    ref.current.position.set(...position.current)
    ref.current.scale.setScalar(scale.current)

    // Reinicio cuando pasa el frente
    if (position.current[2] > 6) {
      position.current[2] = -20 - Math.random() * 10
      position.current[0] = (Math.random() - 0.5) * viewport.width * 1.5
      position.current[1] = (Math.random() - 0.5) * viewport.height * 1.5
      scale.current = 0.5
      activationTime.current = performance.now() + delay
      activated.current = false
    }
  })

  const aspect = texture.image.width / texture.image.height
  const height = 1.5
  const width = height * aspect

  return (
    <mesh ref={ref}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

export default function GalleryPage() {
  const [images, setImages] = useState<string[]>([])

  useEffect(() => {
    const fetchGallery = async () => {
      const resImages = await fetch('/api/approved-index')
      const list = await resImages.json()
      setImages(list)
    }

    fetchGallery()

    // Scroll con aceleración suave
    window.__gallerySpeed = 1
    let targetSpeed = 1
    let lastScroll = performance.now()

    const handleScroll = (e: WheelEvent) => {
      const delta = e.deltaY
      targetSpeed = Math.min(5, Math.max(1, targetSpeed + delta * 0.01))
      lastScroll = performance.now()
    }

    window.addEventListener('wheel', handleScroll)

    const smoothSpeed = () => {
      const now = performance.now()
      const timeSinceScroll = now - lastScroll
      if (timeSinceScroll > 300) {
        targetSpeed = Math.max(1, targetSpeed - 0.1)
      }
      window.__gallerySpeed += (targetSpeed - window.__gallerySpeed) * 0.2
      requestAnimationFrame(smoothSpeed)
    }

    smoothSpeed()

    return () => window.removeEventListener('wheel', handleScroll)
  }, [])

  return (
    <div style={{ height: '100vh', width: '100vw', background: '#000' }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} />
        <Suspense fallback={null}>
          {images.map((filename, i) => (
            <FloatingImage
              key={`${filename}-${i}`}
              textureUrl={`/approved/${filename}`}
              delay={i * 600}
            />
          ))}
        </Suspense>
      </Canvas>
    </div>
  )
}