'use client'

import { Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { Texture, CanvasTexture, LinearFilter } from 'three'
import { GridImageMesh } from './GridImageMesh'

export function GridImageCanvas({
  url,
  onClick,
}: {
  url: string
  onClick: () => void
}) {
  const [texture, setTexture] = useState<Texture | null>(null)

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = url

    img.onload = () => {
      const size = Math.min(img.width, img.height)
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const sx = (img.width - size) / 2
      const sy = (img.height - size) / 2
      ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size)

      const tex = new CanvasTexture(canvas)
      tex.minFilter = LinearFilter
      tex.magFilter = LinearFilter
      tex.needsUpdate = true
      setTexture(tex)
    }
  }, [url])

  if (!texture) return null

  return (
    <Canvas orthographic camera={{ zoom: 100, position: [0, 0, 100] }}>
      <GridImageMesh texture={texture} onClick={onClick} />
    </Canvas>
  )
}