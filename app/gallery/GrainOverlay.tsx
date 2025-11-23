'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useMemo, useState } from 'react'
import * as THREE from 'three'
import { GrainMaterial } from './GrainMaterial'

function GrainPlane() {
  const meshRef = useRef<THREE.Mesh>(null)
  const { size, invalidate } = useThree()

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(size.width, size.height),
    [size.width, size.height]
  )

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.ShaderMaterial
      mat.uniforms.u_time.value = clock.getElapsedTime()
      mat.uniforms.u_resolution.value.set(size.width, size.height)
      // invalidate() // No need to invalidate if frameloop is always (when visible)
    }
  })

  return <mesh ref={meshRef} geometry={geometry} material={GrainMaterial} />
}

export default function GrainOverlay() {
  const [mounted, setMounted] = useState(false)
  const [isTabVisible, setIsTabVisible] = useState(true)

  useEffect(() => setMounted(true), [])

  // 🔹 Detectar visibilidad de la pestaña
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden)
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  if (!mounted) return null

  return (
    <Canvas
      orthographic
      camera={{ zoom: 100, position: [0, 0, 5] }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
      gl={{ alpha: true }}
      frameloop={isTabVisible ? 'always' : 'never'}
      dpr={[1, 1]} // Grain doesn't need high DPI
    >
      <GrainPlane />
    </Canvas>
  )
}
