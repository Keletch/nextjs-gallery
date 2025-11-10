'use client'
import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

export default function SpeedUpdater() {
  const { gl, scene, camera } = useThree()

  useEffect(() => {
    gl.setAnimationLoop(() => {
      gl.render(scene, camera)
    })
  }, [gl, scene, camera])

  return null
}