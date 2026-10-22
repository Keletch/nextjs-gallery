'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Glass, { GlassButton, GlassSelect } from '@/components/Glass'

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
      className="relative min-h-0 cursor-pointer animate-in fade-in zoom-in-95 duration-400 group"
      onClick={onClick}
    >
      <div className={`relative w-full h-full rounded-[22px] overflow-hidden bg-white/[0.04] shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.18),0_12px_32px_-12px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-out group-hover:scale-[1.02] group-active:scale-[0.99] ${isLoading ? 'animate-pulse' : ''}`}>
        <Image
          src={src}
          alt={alt}
          className={`object-cover w-full h-full transition-all duration-500 group-hover:scale-105 ${isLoading ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
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
      setIsMobile(window.innerWidth < 768) // mismo corte que md: en la cuadrícula
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

  const chevron = (d: string) => (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 animate-in fade-in duration-400" onClick={onClose}>
      <Glass
        radius={34}
        frost="heavy"
        className="flex h-[85vh] w-[92%] max-w-[1400px] flex-col animate-in slide-in-from-bottom-10 duration-500"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header con selector y botón cerrar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-5 sm:px-8">
          <div className="flex flex-col">
            <h2 className="m-0 text-2xl font-semibold tracking-tight">Galería CDI</h2>
            <p className="mt-0.5 text-sm text-white/55">
              {loading ? 'Cargando...' : `${images.length} ${images.length === 1 ? 'imagen' : 'imágenes'}`}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <GlassSelect
              value={selectedEventFilter}
              onChange={(e) => setSelectedEventFilter(e.target.value)}
              className="min-w-[200px] text-sm"
            >
              <option value="">Todos los eventos</option>
              {eventos.map((ev) => (
                <option key={ev.id} value={ev.ruta}>
                  {ev.nombre}
                </option>
              ))}
            </GlassSelect>

            <GlassButton onClick={onClose} aria-label="Cerrar" radius={999} className="h-11 w-11 !p-0">
              {chevron('M5 5l10 10M15 5L5 15')}
            </GlassButton>
          </div>
        </div>

        {/* Grid de imágenes: filas fijas que llenan el alto disponible (2 en PC, 3 en celular),
            así las fotos y la paginación siempre caben sin scroll */}
        <div className="flex min-h-0 flex-1 flex-col gap-5 p-5 sm:p-7">
          {loading ? (
            <div className="flex flex-1 items-center justify-center text-white/50">
              <p>Cargando imágenes...</p>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-white/50">
              <p>No hay imágenes para mostrar</p>
            </div>
          ) : (
            <div className="grid min-h-0 w-full flex-1 grid-cols-2 grid-rows-3 gap-3 sm:gap-4 md:grid-cols-4 md:grid-rows-2">
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
            <Glass radius={999} frost="regular" className="mx-auto flex w-fit shrink-0 items-center gap-2 px-2 py-2">
              <GlassButton onClick={goToPrevPage} disabled={page === 0} aria-label="Página anterior" radius={999} className="h-9 w-9 !p-0">
                {chevron('M12.5 5l-5 5 5 5')}
              </GlassButton>

              <div className="px-3 text-sm font-medium tabular-nums">
                {page + 1} / {totalPages}
              </div>

              <GlassButton onClick={goToNextPage} disabled={page === totalPages - 1} aria-label="Página siguiente" radius={999} className="h-9 w-9 !p-0">
                {chevron('M7.5 5l5 5-5 5')}
              </GlassButton>
            </Glass>
          )}
        </div>
      </Glass>
    </div>
  )
}
