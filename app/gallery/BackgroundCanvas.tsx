'use client'
import { useEffect, useState, useRef } from 'react'
import ColorBends from '@/components/ColorBends'

interface BackgroundCanvasProps {
  selectedEvent: string
  color?: string
}

// Default color palette (dark green/forest theme)
// Expanded to 4 colors to match generateColorVariations and prevent interpolation errors
const DEFAULT_COLORS = ['#0d401a', '#082010', '#06180c', '#041008']

// Helper to convert Hex to RGB [0-1]
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

// Helper to convert RGB [0-1] to Hex
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Interpolate between two RGB arrays
function lerpRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]
}

// Generate color variations for ColorBends
function generateColorVariations(baseColor: string): string[] {
  const [r, g, b] = hexToRgb(baseColor)

  // Create variations by adjusting brightness
  const colors = [
    baseColor,
    rgbToHex(Math.min(r * 1.3, 1), Math.min(g * 1.3, 1), Math.min(b * 1.3, 1)),
    rgbToHex(r * 0.7, g * 0.7, b * 0.7),
    rgbToHex(r * 0.4, g * 0.4, b * 0.4),
  ]

  return colors
}

// Generate random parameters like in home page
function generateRandomParams() {
  return {
    rotation: Math.random() * 360,
    speed: 0.2 + Math.random() * 0.5,
    scale: Math.random() * 2,
    frequency: 1 + Math.random() * 2,
    warpStrength: 1,
    mouseInfluence: 1.2,
    parallax: Math.random(),
    noise: 0, // Noise handled by separate overlay component
  }
}

export default function BackgroundCanvas({ selectedEvent, color }: BackgroundCanvasProps) {
  const [mounted, setMounted] = useState(false)
  const [colors, setColors] = useState<string[]>(DEFAULT_COLORS)

  const [colorBendsParams] = useState(() => ({
    ...generateRandomParams(),
  }))

  // Initialize on mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Update colors when event changes
  useEffect(() => {
    const newColors = color ? generateColorVariations(color) : DEFAULT_COLORS
    setColors(newColors)
  }, [selectedEvent, color])

  if (!mounted) {
    return (
      <div className="absolute inset-0 z-[-1] pointer-events-none bg-black" style={{ width: '100%', height: '100%' }} />
    )
  }

  return (
    <div className="absolute inset-0 z-[-1] pointer-events-none" style={{ width: '100%', height: '100%' }}>
      <ColorBends {...colorBendsParams} colors={colors} transparent />
    </div>
  )
}
