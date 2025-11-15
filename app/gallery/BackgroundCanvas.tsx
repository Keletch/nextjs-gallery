'use client'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef, useMemo, useEffect, useState } from 'react'
import * as THREE from 'three'
import './NebulaMaterial'

interface BackgroundCanvasProps {
  selectedEvent: string
}

const EVENT_COLORS: Record<string, { subColor: [number, number, number]; accentColor: [number, number, number] }> = {
  shift2025: {
    subColor: [0.28, 0.07, 0.38],
    accentColor: [0.0, 0.0, 0.0],
  },
  predictronics: {
    subColor: [0.12, 0.02, 0.21],
    accentColor: [0.0, 0.0, 0.0],
  },
  default: {
    subColor: [0.28, 0.07, 0.38],
    accentColor: [0.0, 0.0, 0.0],
  },
}

function BackgroundMesh({ selectedEvent }: BackgroundCanvasProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { viewport, gl } = useThree()
  const resolution: [number, number] = [viewport.width, viewport.height]
  const aspect = resolution[0] / resolution[1]
  const area = resolution[0] * resolution[1]
  const seed = useMemo(() => Math.random() * 1000, [])

  // 🔹 Prevenir que el renderer se pierda
  useEffect(() => {
    if (gl) {
      gl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }
  }, [gl])

  useFrame((state) => {
    // ✅ Pausar si la pestaña está oculta
    if (document.hidden) return
    
    if (meshRef.current) {
      const mat = meshRef.current.material as any
      if (mat?.uniforms?.time) {
        mat.uniforms.time.value = state.clock.getElapsedTime() * 0.4
      }
      if (mat?.uniforms?.resolution) {
        mat.uniforms.resolution.value = new THREE.Vector2(...resolution)
      }
      if (mat?.uniforms?.aspect) {
        mat.uniforms.aspect.value = aspect
      }
      if (mat?.uniforms?.area) {
        mat.uniforms.area.value = area
      }
    }
  })

  const { subColor, accentColor } = EVENT_COLORS[selectedEvent] || EVENT_COLORS.default
  const geometry = useMemo(() => new THREE.PlaneGeometry(...resolution), [resolution[0], resolution[1]])

  return (
    <mesh ref={meshRef} position={[0, 0, -10]} geometry={geometry}>
      <nebulaMaterial
        attach="material"
        time={0}
        resolution={resolution}
        seed={seed}
        subColor={subColor}
        accentColor={accentColor}
        aspect={aspect}
        area={area}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}

export default function BackgroundCanvas({ selectedEvent }: BackgroundCanvasProps) {
  const [isVisible, setIsVisible] = useState(true)
  const canvasRef = useRef<HTMLDivElement>(null)

  // 🔹 Mantener siempre visible en móvil para evitar desmontaje
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const isMobile = /Mobi|Android/i.test(navigator.userAgent)
    if (!isMobile) return

    // En móvil, siempre mantener montado
    setIsVisible(true)
  }, [])

  return (
    <div 
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
      }}
    >
      {isVisible && (
        <Canvas
          orthographic
          camera={{ zoom: 100, position: [0, 0, 5] }}
          style={{
            position: 'absolute',
            inset: 0,
          }}
          gl={{ 
            alpha: true,
            antialias: false,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: true,
          }}
          frameloop="always"
          dpr={[1, 2]}
        >
          <BackgroundMesh selectedEvent={selectedEvent} />
        </Canvas>
      )}
    </div>
  )
}