'use client'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef, useMemo, useEffect, useState } from 'react'
import * as THREE from 'three'
import './NebulaMaterial'

interface BackgroundCanvasProps {
  selectedEvent: string
  color?: string
}

// 🔹 Paletas de colores por evento (Legacy / Fallback)
const EVENT_COLORS: Record<string, { subColor: [number, number, number]; accentColor: [number, number, number] }> = {
  default: {
    // Verde oscuro / Bosque profundo
    subColor: [0.05, 0.25, 0.1],
    accentColor: [0.0, 0.0, 0.0],
  },
}

// Helper para convertir Hex a RGB [0-1]
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ]
    : [0, 0, 0]
}

function BackgroundMesh({ selectedEvent, color }: BackgroundCanvasProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { viewport, gl } = useThree()
  const resolution: [number, number] = [viewport.width, viewport.height]
  const aspect = resolution[0] / resolution[1]
  const area = resolution[0] * resolution[1]
  const seed = useMemo(() => Math.random() * 1000, [])

  // 🔹 Determinar colores iniciales
  const getColors = () => {
    if (color) {
      return {
        subColor: hexToRgb(color),
        accentColor: [0.0, 0.0, 0.0] as [number, number, number],
      }
    }
    return EVENT_COLORS[selectedEvent] || EVENT_COLORS.default
  }

  // 🔹 Capturar colores iniciales (solo al montar) para evitar que R3F sobrescriba los uniforms
  const [startColors] = useState(getColors)

  // 🔹 Refs para interpolación de color (inicializados con los colores de arranque)
  const currentSubColor = useRef(new THREE.Vector3(...startColors.subColor))
  const currentAccentColor = useRef(new THREE.Vector3(...startColors.accentColor))

  const targetSubColor = useRef(new THREE.Vector3(...startColors.subColor))
  const targetAccentColor = useRef(new THREE.Vector3(...startColors.accentColor))

  // 🔹 Actualizar objetivos de color cuando cambia el evento o el color prop
  useEffect(() => {
    const colors = getColors()
    targetSubColor.current.set(...colors.subColor)
    targetAccentColor.current.set(...colors.accentColor)
  }, [selectedEvent, color])

  // 🔹 Prevenir que el renderer se pierda
  useEffect(() => {
    if (gl) {
      gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)) // Reducir DPR máximo para rendimiento
    }
  }, [gl])

  useFrame((state, delta) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as any

      // 🔹 Interpolación suave de colores (Lerp)
      // Ajusta el 2.0 para cambiar la velocidad de transición
      const lerpSpeed = 0.5 * delta
      currentSubColor.current.lerp(targetSubColor.current, lerpSpeed)
      currentAccentColor.current.lerp(targetAccentColor.current, lerpSpeed)

      // 🔹 Actualizar Uniforms
      if (mat?.uniforms) {
        if (mat.uniforms.time) mat.uniforms.time.value = state.clock.getElapsedTime() * 0.4

        // Fix: Assign new Vector2 instead of calling .set() because the initial value might be an array
        if (mat.uniforms.resolution) mat.uniforms.resolution.value = new THREE.Vector2(resolution[0], resolution[1])

        if (mat.uniforms.aspect) mat.uniforms.aspect.value = aspect
        if (mat.uniforms.area) mat.uniforms.area.value = area

        // Fix: Assign the Vector3 directly (or a clone) instead of .copy()
        if (mat.uniforms.subColor) mat.uniforms.subColor.value = currentSubColor.current
        if (mat.uniforms.accentColor) mat.uniforms.accentColor.value = currentAccentColor.current
      }
    }
  })

  const geometry = useMemo(() => new THREE.PlaneGeometry(...resolution), [resolution[0], resolution[1]])

  return (
    <mesh ref={meshRef} position={[0, 0, -10]} geometry={geometry}>
      <nebulaMaterial
        attach="material"
        time={0}
        resolution={resolution}
        seed={seed}
        subColor={startColors.subColor}
        accentColor={startColors.accentColor}
        aspect={aspect}
        area={area}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}

export default function BackgroundCanvas({ selectedEvent, color }: BackgroundCanvasProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isTabVisible, setIsTabVisible] = useState(true)
  const canvasRef = useRef<HTMLDivElement>(null)

  // 🔹 Mantener siempre visible en móvil para evitar desmontaje
  useEffect(() => {
    if (typeof window === 'undefined') return

    const isMobile = /Mobi|Android/i.test(navigator.userAgent)
    if (!isMobile) return

    // En móvil, siempre mantener montado
    setIsVisible(true)
  }, [])

  // 🔹 Detectar visibilidad de la pestaña
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden)
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
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
          frameloop={isTabVisible ? 'always' : 'never'}
          dpr={[1, 1.5]}
        >
          <BackgroundMesh selectedEvent={selectedEvent} color={color} />
        </Canvas>
      )}
    </div>
  )
}
