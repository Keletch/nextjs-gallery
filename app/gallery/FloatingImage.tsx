'use client'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { TextureLoader, Mesh, Euler } from 'three'
import { useEffect, useState, useRef } from 'react'
import * as THREE from 'three'
import './AberratedMaterial'

interface FloatingImageProps {
  textureUrl: string
  delay: number
  onClick: (url: string) => void
  onExit?: () => void
  forceHidden?: boolean
}

declare global {
  interface Window {
    __gallerySpeed: number
  }
}

export default function FloatingImage({ textureUrl, delay, onClick, onExit, forceHidden }: FloatingImageProps) {
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

  // 🔹 Variables para tilt
  const targetRotation = useRef(new Euler())
  const maxTilt = 0.3

  useEffect(() => {
    const onVisibilityChange = () => {
      lastFrameTime.current = performance.now()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  useFrame(() => {
    // ✅ PAUSAR TODO si la pestaña está oculta
    if (document.hidden) {
      lastFrameTime.current = performance.now()
      return
    }

    // ✅ Si está forzada a oculta, no renderizar nada
    if (forceHidden) {
      if (ref.current) {
        ref.current.visible = false
      }
      return
    }

    if (ref.current) {
      ref.current.visible = true
    }

    const now = performance.now()
    let delta = now - lastFrameTime.current
    lastFrameTime.current = now
    if (delta > 50) delta = 16.67
    localTimer.current += delta

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

    // 🔹 Aplica el tilt gradual
    ref.current.rotation.x += (targetRotation.current.x - ref.current.rotation.x) * 0.1
    ref.current.rotation.y += (targetRotation.current.y - ref.current.rotation.y) * 0.1

    // 🔹 Movimiento flotante si no está pausado
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
      targetRotation.current.set(0, 0, 0)
      
      // ✅ Notificar que salió
      if (onExit) onExit()
    }
  })

  const aspect = texture.image.width / texture.image.height
  const height = 1.5
  const width = height * aspect

  if (!visible && !forceHidden) return null

  return (
    <mesh
      ref={ref}
      onPointerMove={(e) => {
        e.stopPropagation()
        if (!hoveredRef.current || !e.uv) return
        // 🔹 Calcula el tilt según posición del cursor
        targetRotation.current.x = (e.uv.y - 0.5) * maxTilt
        targetRotation.current.y = -(e.uv.x - 0.5) * maxTilt
      }}
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
        targetRotation.current.set(0, 0, 0)
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