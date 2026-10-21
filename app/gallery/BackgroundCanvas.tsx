'use client'
import { useEffect, useState, useRef } from 'react'
import GhostFibers from '@/components/GhostFibers'
import { BRAND_GREEN, randomFiberParams } from '@/lib/background'

interface BackgroundCanvasProps {
  selectedEvent: string
  color?: string
}

// Duración de la transición de color al cambiar de evento
const COLOR_TRANSITION_MS = 1000

type Rgb = [number, number, number]

// Helper to convert Hex to RGB [0-1]
function hexToRgb(hex: string): Rgb {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ]
    : [0, 0, 0]
}

// Helper to convert RGB [0-1] to Hex
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Interpolate between two RGB arrays
function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]
}

// Variaciones del color del evento: [principal, brillos/pliegues, degradado secundario]
function generateColorVariations(baseColor: string): Rgb[] {
  const [r, g, b] = hexToRgb(baseColor)

  return [
    [r, g, b],
    [Math.min(r * 1.3 + 0.25, 1), Math.min(g * 1.3 + 0.25, 1), Math.min(b * 1.3 + 0.25, 1)],
    [r * 0.6, g * 0.6, b * 0.6],
  ]
}

export default function BackgroundCanvas({ selectedEvent, color }: BackgroundCanvasProps) {
  const [mounted, setMounted] = useState(false)
  const [colors, setColors] = useState<Rgb[]>(() => generateColorVariations(BRAND_GREEN))
  const colorsRef = useRef(colors)

  // Aleatorio una vez por visita (ángulo, velocidad, giro, ondas...)
  const [fiberParams] = useState(() => randomFiberParams())

  // Initialize on mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Transición suave de color cuando cambia el evento (ease-in-out, como el fondo anterior)
  useEffect(() => {
    const from = colorsRef.current
    const to = generateColorVariations(color || BRAND_GREEN)
    const start = performance.now()
    let raf = 0

    const step = (now: number) => {
      const progress = Math.min((now - start) / COLOR_TRANSITION_MS, 1)
      const t = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2
      const next = from.map((c, i) => lerpRgb(c, to[i], t))
      colorsRef.current = next
      setColors(next)
      if (progress < 1) raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [selectedEvent, color])

  if (!mounted) {
    return (
      <div className="absolute inset-0 z-[-1] pointer-events-none bg-black" style={{ width: '100%', height: '100%' }} />
    )
  }

  const [glow, line, secondary] = colors.map(c => rgbToHex(...c))

  return (
    <div className="absolute inset-0 z-[-1] pointer-events-none" style={{ width: '100%', height: '100%' }}>
      <GhostFibers
        {...fiberParams}
        glowColor={glow}
        lineColor={line}
        secondaryColor={secondary}
        dpr={1.5}
      />
    </div>
  )
}
