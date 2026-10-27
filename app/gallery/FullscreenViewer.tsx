'use client'

import { useEffect, useState } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import { Download, Link } from 'lucide-react'
import Glass, { GlassButton } from '@/components/Glass'

interface FullscreenViewerProps {
  hash: string
  onClose: () => void
}

// Componente Typewriter para efecto de escritura
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
    hashtags: string
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

      const { data: eventoData } = await supabaseClient
        .from('events')
        .select('nombre, hashtags')
        .eq('ruta', eventoRaw)
        .maybeSingle()

      setInfo({
        evento: eventoData?.nombre || eventoRaw,
        description: data.description || '',
        hashtags: eventoData?.hashtags || '',
        created_at: data.created_at,
      })

      setImageUrl(`${base}/${eventoRaw}/approved/${hash}.webp`)
    }

    fetchInfo()
  }, [hash])

  // Texto al compartir: hashtags al final (los del proyecto y luego los del evento)
  const shareText = `¡Estoy en el evento ${info?.evento}! #elclubdeinversionistas #hyenukchu ${info?.hashtags ?? ''}`.trim()

  const shareOnX = () => {
    const text = encodeURIComponent(shareText)
    const url = encodeURIComponent(`https://galeria.chu.mx/gallery?open=${hash}`)
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
  }

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(`${shareText}\nhttps://galeria.chu.mx/gallery?open=${hash}`)
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

  const loading = (!imageUrl || !info) && hashValid

  const infoPanel = info && (
    <Glass
      radius={28}
      frost="heavy"
      className="w-full px-6 py-5 text-center animate-in fade-in slide-in-from-bottom-5 duration-700 delay-300"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="mb-1 text-lg font-semibold tracking-tight">
        <TypewriterText text={info.evento} speed={30} />
      </p>
      <p className="mb-2 text-[15px] text-white/90">
        {/* Sin descripción (es opcional al subir): "Estoy en" con el hashtag del evento; si no tiene, uno armado con su nombre */}
        <TypewriterText text={info.description ? `${info.description} ${info.hashtags}`.trim() : `Estoy en ${info.hashtags || `#${info.evento.replace(/[^\p{L}\p{N}_]/gu, '')}`}`} delay={500} speed={20} />
      </p>
      <p className="mb-4 text-xs text-white/65">
        <TypewriterText
          text={`Subido el ${new Date(info.created_at).toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}`}
          delay={1000}
          speed={20}
        />
      </p>

      {/* Solo íconos en un renglón: el espacio que ahorran se lo lleva la foto */}
      <div className="flex justify-center gap-3">
        <GlassButton radius={999} onClick={shareOnWhatsApp} aria-label="Compartir en WhatsApp" title="Compartir en WhatsApp" className="h-11 w-11 !p-0">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
            <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35zM12.05 21.5h-.01a9.4 9.4 0 01-4.8-1.31l-.34-.2-3.56.93.95-3.47-.22-.36a9.4 9.4 0 01-1.44-5.01c0-5.2 4.24-9.43 9.44-9.43 2.52 0 4.89.98 6.67 2.77a9.36 9.36 0 012.76 6.67c0 5.2-4.24 9.43-9.45 9.43zm8.03-17.46A11.27 11.27 0 0012.05.7C5.8.7.7 5.79.7 12.05c0 2 .52 3.95 1.52 5.67L.6 23.6l6.02-1.58a11.3 11.3 0 005.42 1.38h.01c6.25 0 11.35-5.09 11.35-11.35 0-3.03-1.18-5.88-3.32-8.02z" />
          </svg>
        </GlassButton>
        <GlassButton radius={999} onClick={shareOnX} aria-label="Compartir en X" title="Compartir en X" className="h-11 w-11 !p-0">
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
            <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64z" />
          </svg>
        </GlassButton>
        <GlassButton radius={999} onClick={copyLink} aria-label="Copiar enlace" title="Copiar enlace" className="h-11 w-11 !p-0">
          <Link className="h-5 w-5" strokeWidth={1.8} />
        </GlassButton>
        <GlassButton radius={999} selected onClick={downloadImage} aria-label="Descargar imagen" title="Descargar imagen" className="h-11 w-11 !p-0">
          <Download className="h-5 w-5" strokeWidth={1.8} />
        </GlassButton>
      </div>
    </Glass>
  )

  const loadingState = (
    <div className="flex items-center text-lg text-white/60">
      Cargando
      <div className="ml-1 flex">
        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
      </div>
    </div>
  )

  const invalidState = (
    <Glass radius={20} frost="heavy" className="px-5 py-4 text-center text-sm text-white/80">
      Hash inválido o no se encontró información.
    </Glass>
  )

  return (
    <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-2xl animate-in fade-in duration-500" onClick={onClose}>

      {/* Cerrar */}
      <GlassButton
        aria-label="Cerrar"
        radius={999}
        className="absolute right-4 top-4 z-10 h-11 w-11 !p-0"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
        </svg>
      </GlassButton>

      {/* Un solo layout para todos los tamaños: la foto tiene un alto máximo para que siempre quepa
          completa junto con el panel, y el panel va debajo (antes en móvil la foto no tenía límite de
          alto y en escritorio el panel la tapaba) */}
      <div
        className="flex h-full w-full flex-col items-center overflow-y-auto overflow-x-hidden px-4 py-16 scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onClick={onClose}
      >
        <div className="my-auto flex w-full flex-col items-center gap-5">
          {loading && loadingState}

          {imageUrl && (
            <img
              src={imageUrl}
              alt="fullscreen"
              className={`h-auto max-h-[max(50dvh,calc(100dvh-300px))] w-auto max-w-[min(94vw,1300px)] rounded-[28px] object-contain shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)] transition-all duration-700 ease-out ${imageLoaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-95 blur-sm'}`}
              onLoad={() => setImageLoaded(true)}
            />
          )}

          {info && <div className="w-full max-w-[600px]">{infoPanel}</div>}

          {!hashValid && !info && invalidState}
        </div>
      </div>
    </div>
  )
}
