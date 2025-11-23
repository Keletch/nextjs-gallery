'use client'

import { useEffect, useState, useRef } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import styles from './GalleryPage.module.css'

interface FullscreenViewerProps {
  hash: string
  onClose: () => void
}

// ✅ Componente Typewriter para efecto de escritura
function TypewriterText({ text, delay = 0, speed = 30 }: { text: string; delay?: number; speed?: number }) {
  const [displayedText, setDisplayedText] = useState('')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setStarted(true)
    }, delay)
    return () => clearTimeout(timeout)
  }, [delay])

  useEffect(() => {
    if (!started) return

    let i = 0
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1))
      i++
      if (i >= text.length) clearInterval(interval)
    }, speed)

    return () => clearInterval(interval)
  }, [text, started, speed])

  return <span>{displayedText}</span>
}

export default function FullscreenViewer({ hash, onClose }: FullscreenViewerProps) {
  const base = 'https://sinpfcbinaiasorunmpz.supabase.co/storage/v1/object/public/nextjsGallery'

  const [imageUrl, setImageUrl] = useState<string>('')
  const [info, setInfo] = useState<{
    evento: string
    description: string
    created_at: string
  } | null>(null)

  const [hashValid, setHashValid] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    if (!hash || hash.length !== 64) {
      setHashValid(false)
      return
    }

    const fetchInfo = async () => {
      // Simular un pequeño delay para que se aprecie la animación de carga (opcional, quitar en prod si se quiere max velocidad)
      // await new Promise(r => setTimeout(r, 800)) 

      const { data } = await supabaseClient
        .from('imageInfo')
        .select('evento, description, created_at')
        .eq('imghash', hash)
        .maybeSingle()

      if (!data) {
        setHashValid(false)
        return
      }

      const eventoRaw = data.evento
      let eventoNombre = eventoRaw

      const { data: eventoData } = await supabaseClient
        .from('events')
        .select('nombre')
        .eq('ruta', eventoRaw)
        .maybeSingle()

      if (eventoData?.nombre) {
        eventoNombre = eventoData.nombre
      }

      setInfo({
        evento: eventoNombre,
        description: data.description || 'Sin descripción',
        created_at: data.created_at,
      })

      setImageUrl(`${base}/${eventoRaw}/approved/${hash}.webp`)
    }

    fetchInfo()
  }, [hash])

  const shareOnX = () => {
    const text = encodeURIComponent(`#elclubdeinversionistas #hyenukchu, ¡Estoy en el evento!: ${info?.evento}`)
    const url = encodeURIComponent(`https://galeria.chu.mx/gallery?open=${hash}`)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
  }

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(`#elclubdeinversionistas #hyenukchu, ¡Estoy en el evento!: ${info?.evento}\nhttps://galeria.chu.mx/gallery?open=${hash}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const copyLink = () => {
    const link = `https://galeria.chu.mx/gallery?open=${hash}`
    navigator.clipboard.writeText(link)
    alert('Enlace copiado al portapapeles')
  }

  const downloadImage = async () => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      // Formatear fecha para el nombre del archivo: YYYY-MM-DD_HH-mm-ss
      const date = new Date(info?.created_at || Date.now())
      const dateStr = date.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-')
      const filename = `${info?.evento || 'evento'}-${dateStr}.webp`

      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading image:', error)
      // Fallback
      window.open(imageUrl, '_blank')
    }
  }

  return (
    <div className={styles.viewerOverlay} onClick={onClose}>

      {/* 🔹 Estado de Carga con animación de puntos */}
      {(!imageUrl || !info) && hashValid && (
        <div style={{ display: 'flex', alignItems: 'center', color: '#aaa', fontSize: '1.2rem' }}>
          Cargando datos
          <div className={styles.jumpingDots}>
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </div>
        </div>
      )}

      {/* 🔹 Imagen con Fade-In */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="fullscreen"
          className={`${styles.viewerImage} ${styles.fadeInImage} ${imageLoaded ? styles.visible : ''}`}
          onLoad={() => setImageLoaded(true)}
        />
      )}

      {/* 🔹 Información con efecto Typewriter */}
      {info && (
        <div className={styles.viewerInfo}>
          <p>
            <strong>Evento: </strong>
            <TypewriterText text={info.evento} speed={30} />
          </p>
          <p>
            <strong>Descripción: </strong>
            <TypewriterText text={info.description} delay={500} speed={20} />
          </p>
          <p style={{ opacity: 0.7 }}>
            <strong>Subido el: </strong>
            <TypewriterText
              text={new Date(info.created_at).toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              delay={1000}
              speed={20}
            />
          </p>

          <div className={styles.viewerButtons}>
            <button className={styles.staggeredButton} onClick={shareOnX}>Compartir en X</button>
            <button className={styles.staggeredButton} onClick={shareOnWhatsApp}>Compartir en WhatsApp</button>
            <button className={styles.staggeredButton} onClick={copyLink}>Copiar enlace</button>
            <button className={styles.staggeredButton} onClick={downloadImage}>Descargar imagen</button>
          </div>
        </div>
      )}

      {!hashValid && !info && (
        <div className={styles.viewerInfo}>
          <p style={{ color: '#f88' }}>⚠️ Hash inválido o no se encontró información.</p>
        </div>
      )}
    </div>
  )
}