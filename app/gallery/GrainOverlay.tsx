'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef, useMemo, useState, useEffect } from 'react'
import * as THREE from 'three'

const fragmentShader = `
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;

#define SPEED 2.0
#define INTENSITY 0.035
#define MEAN 0.0
#define VARIANCE 0.3

float gaussian(float z, float u, float o) {
  return (1.0 / (o * sqrt(6.2831))) * exp(-((z - u) * (z - u)) / (2.0 * o * o));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float t = u_time * SPEED;
  float seed = dot(uv, vec2(12.9898, 78.233));
  float noise = fract(sin(seed) * 43758.5453 + t);
  noise = gaussian(noise, MEAN, VARIANCE * VARIANCE);

  vec3 grain = vec3(noise);
  gl_FragColor = vec4(grain, INTENSITY);
}
`

const vertexShader = `
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

function GrainMesh() {
  const meshRef = useRef<THREE.Mesh>(null)
  const { viewport, invalidate } = useThree()
  const resolution: [number, number] = [viewport.width, viewport.height]

  const geometry = useMemo(() => new THREE.PlaneGeometry(...resolution), [resolution[0], resolution[1]])

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.ShaderMaterial
      mat.uniforms.u_time.value = clock.getElapsedTime()
      mat.uniforms.u_resolution.value.set(...resolution)
      invalidate()
    }
  })

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <shaderMaterial
        attach="material"
        transparent
        depthWrite={false}
        uniforms={{
          u_time: { value: 0 },
          u_resolution: { value: new THREE.Vector2(...resolution) },
        }}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  )
}

export default function GrainOverlay() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
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
    >
      <GrainMesh />
    </Canvas>
  )
}