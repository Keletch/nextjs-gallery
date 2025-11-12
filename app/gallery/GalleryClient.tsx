'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import GalleryCanvas from './GalleryCanvas'
import FullscreenViewer from './FullscreenViewer'
import useGallerySpeed from './UseGallerySpeed'
import BackgroundCanvas from './BackgroundCanvas'
import GrainOverlay from './GrainOverlay'
import styles from './GalleryPage.module.css'

interface Evento {
  id: string
  nombre: string
  ruta: string
}

interface GalleryItem {
  filename: string
  folder: string
}

export default function GalleryClient() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [images, setImages] = useState<string[]>([])
  const [urls, setUrls] = useState<Record<string, { thumb: string; full: string; evento: string }>>({})
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [viewportHeight, setViewportHeight] = useState<number>(0)

  const router = useRouter()
  useGallerySpeed()

  // ✅ Leer hash desde la URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const hash = params.get('open')
    if (hash && hash.length === 64) {
      setSelectedImage(hash)
    }
  }, [])

  const extractHash = (url: string) => {
    const filename = url.split('/').pop() || ''
    return filename.replace('.webp', '')
  }

  const handleSelect = (imageUrl: string) => {
    const hash = extractHash(imageUrl)
    window.history.pushState({}, '', `/gallery?open=${hash}`)
    setSelectedImage(hash)
  }

  const handleCloseViewer = () => {
    window.history.replaceState({}, '', '/gallery')
    setSelectedImage(null)
  }

  // ✅ Ajustar altura según viewport
  useEffect(() => {
    const updateHeight = () => setViewportHeight(window.innerHeight)
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  // ✅ Obtener lista de eventos
  useEffect(() => {
    const fetchEventos = async () => {
      const res = await fetch('/api/public-events')
      const data = await res.json()
      setEventos(data)
    }
    fetchEventos()
  }, [])

  // ✅ Obtener galería según evento
  useEffect(() => {
    const fetchGallery = async () => {
      const url = selectedEvent
        ? `/api/gallery-index?evento=${selectedEvent}`
        : `/api/gallery-index`

      const res = await fetch(url)
      const list = await res.json()
      const validList = Array.isArray(list)
        ? list.filter((f: any): f is GalleryItem =>
            f &&
            typeof f.filename === 'string' &&
            typeof f.folder === 'string' &&
            f.filename.trim() !== '' &&
            /\.(png|jpe?g|webp|gif)$/i.test(f.filename)
          )
        : []

      setImages(validList.map((item) => item.filename))

      const base = 'https://sinpfcbinaiasorunmpz.supabase.co/storage/v1/object/public/nextjsGallery'
      const entries = validList.map(({ filename, folder }) => {
        const thumbFolder = folder.replace('/approved', '/thumbnails')
        const evento = folder.split('/')[0]

        return [
          filename,
          {
            thumb: `${base}/${thumbFolder}/thumb_${filename}`,
            full: `${base}/${folder}/${filename}`,
            evento,
          },
        ]
      })

      setUrls(Object.fromEntries(entries))
    }

    fetchGallery()
  }, [selectedEvent])

  return (
    <>
      {/* 🌫️ Capa superior de grano */}
      <GrainOverlay />

      {/* 🌌 Fondo y galería */}
      <BackgroundCanvas selectedEvent={selectedEvent} />
      <div className={styles.container} style={{ height: `${viewportHeight}px` }}>
        <div className={styles.topBar}>
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className={styles.select}
          >
            <option value="">Todos los eventos</option>
            {eventos.map((ev) => (
              <option key={ev.id} value={ev.ruta}>
                {ev.nombre}
              </option>
            ))}
          </select>
          <button onClick={() => router.push('/upload')} className={styles.button}>
            Subir imagen
          </button>
        </div>

        <GalleryCanvas images={images} urls={urls} onSelect={handleSelect} />
        {selectedImage && (
          <FullscreenViewer hash={selectedImage} onClose={handleCloseViewer} />
        )}

        <img src="/shiftLogo.png" alt="Galería SHIFT" className={styles.logo} />
      </div>
    </>
  )
}
