'use client'

import { useEffect, useState } from 'react'
import GalleryCanvas from './GalleryCanvas'
import FullscreenViewer from './FullscreenViewer'
import useGallerySpeed from './UseGallerySpeed'

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

  useGallerySpeed()

  // ✅ Detectar hash desde la URL al montar
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

  useEffect(() => {
    const updateHeight = () => setViewportHeight(window.innerHeight)
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  useEffect(() => {
    const fetchEventos = async () => {
      const res = await fetch('/api/public-events')
      const data = await res.json()
      setEventos(data)
    }
    fetchEventos()
  }, [])

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
    <div
      style={{
        height: `${viewportHeight}px`,
        width: '100vw',
        background: 'linear-gradient(180deg, #000 0%, #111 50%, #000 100%)',
        position: 'relative',
      }}
    >
      <select
        value={selectedEvent}
        onChange={e => setSelectedEvent(e.target.value)}
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 10,
          padding: '0.5rem',
          background: '#111',
          color: '#fff',
          border: '1px solid #444',
          borderRadius: '4px',
        }}
      >
        <option value="">Todos los eventos</option>
        {eventos.map(ev => (
          <option key={ev.id} value={ev.ruta}>
            {ev.nombre}
          </option>
        ))}
      </select>

      <GalleryCanvas images={images} urls={urls} onSelect={handleSelect} />
      {selectedImage && (
        <FullscreenViewer hash={selectedImage} onClose={handleCloseViewer} />
      )}
    </div>
  )
}