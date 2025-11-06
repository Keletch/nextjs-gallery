'use client'
import { useEffect, useState } from 'react'

export default function GalleryLoader() {
  const [dots, setDots] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev + 1) % 4)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'radial-gradient(circle at center, #111 0%, #000 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace',
      fontSize: '1.5rem',
      color: '#ccc',
      letterSpacing: '0.1em',
      zIndex: 9999,
      animation: 'fadeIn 1s ease-in-out',
    }}>
      <span style={{
        textShadow: '0 0 8px #fff2',
        filter: 'blur(0.3px)',
        transform: 'scale(1.05)',
      }}>
        Cargando galería{'.'.repeat(dots)}
      </span>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}