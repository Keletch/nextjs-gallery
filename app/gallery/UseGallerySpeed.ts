'use client'
import { useEffect } from 'react'

export default function useGallerySpeed() {
  useEffect(() => {
    window.__gallerySpeed = 1
    let targetSpeed = 3
    let lastScroll = performance.now()
    let touchStartY: number | null = null

    const handleScroll = (e: WheelEvent) => {
      const delta = e.deltaY
      targetSpeed = Math.min(5, Math.max(1, targetSpeed + delta * 0.01))
      lastScroll = performance.now()
    }

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY
    }

    const isMobile = typeof window !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent)
    const touchMultiplier = isMobile ? 0.08 : 0.01

    const handleTouchMove = (e: TouchEvent) => {
      if (touchStartY !== null) {
        const currentY = e.touches[0].clientY
        const deltaY = touchStartY - currentY
        targetSpeed = Math.min(5, Math.max(1, targetSpeed + deltaY * touchMultiplier))
        lastScroll = performance.now()
        touchStartY = currentY
      }
    }

    const handleTouchEnd = () => {
      touchStartY = null
    }

    window.addEventListener('wheel', handleScroll, { passive: true })
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })

    const interval = setInterval(() => {
      const now = performance.now()
      const timeSinceScroll = now - lastScroll
      if (timeSinceScroll > 300) {
        targetSpeed = Math.max(1, targetSpeed - 0.02)
      }
      window.__gallerySpeed += (Math.pow(targetSpeed, 0.8) - window.__gallerySpeed) * 0.05
    }, 1000 / 60)

    return () => {
      clearInterval(interval)
      window.removeEventListener('wheel', handleScroll)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])
}