'use client'

import { useEffect, useState } from 'react'
import { supabaseClient } from '@/lib/supabase-client'

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
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-500" onClick={onClose}>

      {/* Estado de Carga con animación de puntos */}
      {(!imageUrl || !info) && hashValid && (
        <div className="flex items-center text-[#aaa] text-xl font-mono">
          Cargando datos
          <div className="flex ml-1">
            <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
          </div>
        </div>
      )}

      {/* Imagen con Fade-In */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="fullscreen"
          className={`max-w-[90vw] max-h-[80vh] object-contain shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-700 ease-out ${imageLoaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-95 blur-sm'} rounded-2xl`}
          onLoad={() => setImageLoaded(true)}
        />
      )}

      {/* Información con efecto Typewriter */}
      {info && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md p-6 rounded-2xl text-[#eaeaea] max-w-[90vw] w-[600px] text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 animate-in slide-in-from-bottom-5 duration-700 delay-300">
          <p className="mb-2 text-lg">
            <strong className="text-[#00ffa3]">Evento: </strong>
            <TypewriterText text={info.evento} speed={30} />
          </p>
          <p className="mb-2 text-base text-[#ccc]">
            <strong className="text-[#00ffa3]">Descripción: </strong>
            <TypewriterText text={info.description} delay={500} speed={20} />
          </p>
          <p className="mb-4 text-sm opacity-70 font-mono">
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

          <div className="flex flex-wrap gap-3 justify-center mt-4">
            <button className="px-4 py-2 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 text-white rounded-lg transition-all duration-300 text-sm font-medium backdrop-blur-sm border border-white/10 hover:border-white/30 hover:scale-105 active:scale-95 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-backwards delay-[1200ms] cursor-pointer" onClick={shareOnX}>Compartir en X</button>
            <button className="px-4 py-2 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 text-white rounded-lg transition-all duration-300 text-sm font-medium backdrop-blur-sm border border-white/10 hover:border-white/30 hover:scale-105 active:scale-95 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-backwards delay-[1300ms] cursor-pointer" onClick={shareOnWhatsApp}>Compartir en WhatsApp</button>
            <button className="px-4 py-2 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 text-white rounded-lg transition-all duration-300 text-sm font-medium backdrop-blur-sm border border-white/10 hover:border-white/30 hover:scale-105 active:scale-95 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-backwards delay-[1400ms] cursor-pointer" onClick={copyLink}>Copiar enlace</button>
            <button className="px-4 py-2 bg-gradient-to-br from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 text-white rounded-lg transition-all duration-300 text-sm font-medium backdrop-blur-sm border border-purple-500/30 hover:border-purple-500/50 hover:shadow-[0_0_15px_rgba(150,100,255,0.3)] hover:scale-105 active:scale-95 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-backwards delay-[1500ms] cursor-pointer" onClick={downloadImage}>Descargar imagen</button>
          </div>
        </div>
      )}

      {!hashValid && !info && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-black/80 p-4 rounded-xl text-[#f88] text-center">
          <p>Hash inválido o no se encontró información.</p>
        </div>
      )}
    </div>
  )
}