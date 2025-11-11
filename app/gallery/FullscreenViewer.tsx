'use client'

import { useEffect, useState } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import styles from './GalleryPage.module.css'

interface FullscreenViewerProps {
  hash: string
  onClose: () => void
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
        description: data.description,
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

  const downloadImage = () => {
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `${info?.evento || 'imagen'}.webp`
    link.click()
  }

  return (
    <div className={styles.viewerOverlay} onClick={onClose}>
      {!imageUrl && hashValid && (
        <p style={{ color: '#aaa', marginBottom: '1rem' }}>Cargando imagen...</p>
      )}
      {imageUrl && (
        <img src={imageUrl} alt="fullscreen" className={styles.viewerImage} />
      )}
      <div className={styles.viewerInfo}>
        {info ? (
          <>
            <p><strong>Evento:</strong> {info.evento}</p>
            <p><strong>Descripción:</strong> {info.description}</p>
            <p style={{ opacity: 0.7 }}>
              <strong>Subido el:</strong>{' '}
              {new Date(info.created_at).toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </>
        ) : !hashValid ? (
          <p style={{ color: '#f88' }}>⚠️ Hash inválido o no se encontró información.</p>
        ) : (
          <p style={{ color: '#aaa' }}>No se encontró información para esta imagen.</p>
        )}
        <div className={styles.viewerButtons}>
          <button onClick={shareOnX}>Compartir en X</button>
          <button onClick={shareOnWhatsApp}>Compartir en WhatsApp</button>
          <button onClick={copyLink}>Copiar enlace</button>
          <button onClick={downloadImage}>Descargar imagen</button>
        </div>
      </div>
    </div>
  )
}