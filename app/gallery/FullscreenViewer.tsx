'use client'

import { useEffect, useState } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
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
      className="w-full p-6 text-center animate-in fade-in slide-in-from-bottom-5 duration-700 delay-300"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="mb-1 text-lg font-semibold tracking-tight">
        <TypewriterText text={info.evento} speed={30} />
      </p>
      <p className="mb-2 text-[15px] text-white/90">
        <TypewriterText text={`${info.description} ${info.hashtags}`.trim() || 'Sin descripción'} delay={500} speed={20} />
      </p>
      <p className="mb-5 text-xs text-white/65">
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

      <div className="flex flex-wrap justify-center gap-2.5">
        <GlassButton size="sm" onClick={shareOnX}>Compartir en X</GlassButton>
        <GlassButton size="sm" onClick={shareOnWhatsApp}>Compartir en WhatsApp</GlassButton>
        <GlassButton size="sm" onClick={copyLink}>Copiar enlace</GlassButton>
        <GlassButton size="sm" selected onClick={downloadImage}>Descargar imagen</GlassButton>
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
              className={`h-auto max-h-[max(42dvh,calc(100dvh-360px))] w-auto max-w-[min(92vw,1200px)] rounded-[28px] object-contain shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)] transition-all duration-700 ease-out ${imageLoaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-95 blur-sm'}`}
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
