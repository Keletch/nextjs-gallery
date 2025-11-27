'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'

type GridGalleryModalProps = {
  initialImages: { id: string; url: string; fullUrl: string; alt?: string }[]
  initialEvent?: string
  eventos: { id: string; nombre: string; ruta: string }[]
  onSelect: (fullUrl: string) => void
  onClose: () => void
}

// Sub-componente para manejar la carga individual de cada imagen
function GridImage({ src, alt, onClick, priority }: { src: string, alt: string, onClick: () => void, priority: boolean }) {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <div
      className="relative aspect-square cursor-pointer animate-in fade-in zoom-in-95 duration-400 group"
      onClick={onClick}
    >
      <div className={`relative w-full h-full rounded-2xl overflow-hidden bg-gradient-to-br from-cyan-500/10 to-green-500/10 backdrop-blur-xl border border-white/20 transition-all duration-400 shadow-[0_8px_32px_rgba(0,0,0,0.3)] group-hover:-translate-y-2 group-hover:scale-[1.02] group-hover:shadow-[0_20px_60px_rgba(0,255,200,0.4)] group-hover:border-cyan-500/40 ${isLoading ? 'animate-pulse' : ''}`}>
        <Image
          src={src}
          alt={alt}
          className={`object-cover w-full h-full transition-all duration-400 group-hover:scale-110 group-hover:brightness-110 ${isLoading ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}
          fill
          sizes="(max-width: 768px) 50vw, 33vw"
          style={{ objectFit: 'cover' }}
          priority={priority}
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  )
}

export function GridGalleryModal({ initialImages, initialEvent, eventos, onSelect, onClose }: GridGalleryModalProps) {
  const [page, setPage] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>(initialEvent || '')
  const [images, setImages] = useState(initialImages)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const IMAGES_PER_PAGE = isMobile ? 6 : 8

  // Fetch de imágenes cuando cambia el filtro
  useEffect(() => {
    if (selectedEventFilter === initialEvent) {
      setImages(initialImages)
      return
    }

    const fetchImages = async () => {
      setLoading(true)
      try {
        const url = selectedEventFilter
          ? `/api/gallery-index?evento=${selectedEventFilter}`
          : `/api/gallery-index`

        const res = await fetch(url)
        const list = await res.json()

        const validList = Array.isArray(list)
          ? list.filter((f: any) =>
            f &&
            typeof f.filename === 'string' &&
            typeof f.folder === 'string' &&
            f.filename.trim() !== '' &&
            /\.(png|jpe?g|webp|gif)$/i.test(f.filename)
          )
          : []

        const base = 'https://sinpfcbinaiasorunmpz.supabase.co/storage/v1/object/public/nextjsGallery'

        const mappedImages = validList.map(({ filename, folder }: any) => {
          const thumbFolder = folder.replace('/approved', '/thumbnails')
          const evento = folder.split('/')[0]

          return {
            id: filename,
            url: `${base}/${thumbFolder}/thumb_${filename}`,
            fullUrl: `${base}/${folder}/${filename}`,
            alt: evento
          }
        })

        setImages(mappedImages)
      } catch (error) {
        console.error("Error fetching grid images:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchImages()
  }, [selectedEventFilter, initialEvent, initialImages])


  const totalPages = Math.ceil(images.length / IMAGES_PER_PAGE)
  const visibleImages = useMemo(
    () => images.slice(page * IMAGES_PER_PAGE, (page + 1) * IMAGES_PER_PAGE),
    [images, page, IMAGES_PER_PAGE]
  )

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  // Reset completo cuando cambia el filtro
  useEffect(() => {
    setPage(0)
  }, [selectedEventFilter])

  const goToNextPage = () => {
    if (page < totalPages - 1) setPage(page + 1)
  }

  const goToPrevPage = () => {
    if (page > 0) setPage(page - 1)
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[10000] flex items-center justify-center animate-in fade-in duration-400" onClick={onClose}>
      <div
        className="w-[90%] max-w-[1400px] h-[85vh] bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl flex flex-col overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.7),0_0_120px_rgba(0,255,200,0.15)] animate-in slide-in-from-bottom-10 duration-500"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header con selector y botón cerrar */}
        <div className="flex justify-between items-center px-8 py-6 bg-gradient-to-r from-cyan-500/15 via-green-500/10 to-cyan-500/15 backdrop-blur-xl border-b border-white/20">
          <div className="flex flex-col">
            <h2 className="m-0 text-2xl font-bold text-white font-mono drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">Galería CDI</h2>
            <p className="mt-1 text-sm text-white/70 font-mono">
              {loading ? 'Cargando...' : `${images.length} ${images.length === 1 ? 'imagen' : 'imágenes'}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedEventFilter}
              onChange={(e) => setSelectedEventFilter(e.target.value)}
              className="px-4 py-3 bg-white/5 backdrop-blur-xl text-[#eaeaea] border border-white/10 rounded-xl font-mono text-sm font-medium cursor-pointer transition-all duration-300 min-w-[180px] shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/10 hover:border-white/30 hover:-translate-y-px focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
            >
              <option value="" className="bg-[#1a1a1a] text-[#eaeaea]">Todos los eventos</option>
              {eventos.map((ev) => (
                <option key={ev.id} value={ev.ruta} className="bg-[#1a1a1a] text-[#eaeaea]">
                  {ev.nombre}
                </option>
              ))}
            </select>

            <button
              onClick={onClose}
              className="bg-gradient-to-br from-red-500/20 to-pink-500/20 backdrop-blur-xl border border-red-500/30 text-white cursor-pointer p-3 rounded-xl transition-all duration-300 flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(255,50,100,0.4)] hover:rotate-90 hover:scale-110 active:scale-95"
              aria-label="Cerrar"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Grid de imágenes */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 scrollbar-hide">
          {loading ? (
            <div className="flex items-center justify-center min-h-[300px] text-white/50 text-base font-mono">
              <p>Cargando imágenes...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="flex items-center justify-center min-h-[300px] text-white/50 text-base font-mono">
              <p>No hay imágenes para mostrar</p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 w-full">
              {visibleImages.map((img, index) => (
                <GridImage
                  key={`${img.id}-${selectedEventFilter}`}
                  src={img.url}
                  alt={img.alt || 'Imagen de galería'}
                  onClick={() => {
                    onSelect(img.fullUrl)
                    onClose()
                  }}
                  priority={index < 4}
                />
              ))}
            </div>
          )}

          {/* Paginación */}
          {!loading && totalPages > 1 && (
            <div className="flex gap-3 mt-8 justify-center items-center px-5 py-3.5 bg-gradient-to-br from-cyan-500/15 to-green-500/15 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] w-fit mx-auto border border-white/20">
              <button
                onClick={goToPrevPage}
                disabled={page === 0}
                className="flex items-center justify-center bg-white/5 backdrop-blur-md border border-white/10 text-[#eaeaea] p-2.5 rounded-lg cursor-pointer transition-all duration-300 min-w-[36px] h-9 hover:bg-cyan-500/20 hover:border-cyan-500/30 hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Página anterior"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                </svg>
              </button>

              <div className="text-white font-mono text-sm font-bold px-3">
                {page + 1} / {totalPages}
              </div>

              <button
                onClick={goToNextPage}
                disabled={page === totalPages - 1}
                className="flex items-center justify-center bg-white/5 backdrop-blur-md border border-white/10 text-[#eaeaea] p-2.5 rounded-lg cursor-pointer transition-all duration-300 min-w-[36px] h-9 hover:bg-cyan-500/20 hover:border-cyan-500/30 hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Página siguiente"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L10.83 12z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}