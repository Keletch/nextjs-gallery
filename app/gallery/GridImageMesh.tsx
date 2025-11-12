'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'
import type { Texture } from 'three'

export function GridImageMesh({
  texture,
  onClick,
}: {
  texture: Texture
  onClick: () => void
}) {
  const ref = useRef<Mesh>(null)
  const hovered = useRef(false)
  const opacity = useRef(0)
  const intensity = useRef(0)
  const size = 1.5

  useFrame(() => {
    if (!ref.current) return
    const mat = ref.current.material as any
    if (!mat) return

    const target = hovered.current ? 2.5 : 0
    intensity.current += (target - intensity.current) * 0.03
    opacity.current += (1 - opacity.current) * 0.05

    mat.intensity = intensity.current
    mat.opacity = opacity.current
  })

  return (
    <mesh
      ref={ref}
      onPointerOver={() => {
        hovered.current = true
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        hovered.current = false
        document.body.style.cursor = 'default'
      }}
      onClick={onClick}
    >
      <planeGeometry args={[size, size]} />
      <aberratedMaterial
        map={texture}
        transparent
        opacity={0}
        intensity={0}
        radius={0.15}
        toneMapped={false}
      />
    </mesh>
  )
}