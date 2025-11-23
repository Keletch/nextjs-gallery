'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import styles from './GalleryPage.module.css'

type GridGalleryModalProps = {
  initialImages: { id: string; url: string; fullUrl: string; alt?: string }[]
  initialEvent?: string
  eventos: { id: string; nombre: string; ruta: string }[]
  onSelect: (fullUrl: string) => void
  onClose: () => void
}

// 🔹 Sub-componente para manejar la carga individual de cada imagen
function GridImage({ src, alt, onClick, priority }: { src: string, alt: string, onClick: () => void, priority: boolean }) {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <div
      className={styles.gridCell}
      onClick={onClick}
    >
      <div className={`${styles.gridCellInner} ${isLoading ? styles.loading : ''}`}>
        <Image
          src={src}
          alt={alt}
          className={`${styles.gridImage} ${isLoading ? styles.imageLoading : styles.imageLoaded}`}
          fill
          sizes="(max-width: 768px) 50vw, 33vw"
          style={{ objectFit: 'cover' }}
          priority={priority}
          onLoad={() => setIsLoading(false)}
        />
        <div className={styles.gridCellOverlay}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
          </svg>
        </div>
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

  // ✅ Fetch de imágenes cuando cambia el filtro
  useEffect(() => {
    // Si es la primera carga y coincide con initialImages, no hacemos fetch (opcional, pero ahorra un request)
    // Pero para simplificar y asegurar consistencia, podemos hacer fetch siempre que cambie el filtro
    // O mejor: si el filtro es igual al initialEvent, usamos initialImages. Si no, fetch.

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

  // ✅ Reset completo cuando cambia el filtro
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
    <div className={styles.gridModalOverlay} onClick={onClose}>
      <div className={styles.gridModalContent} onClick={(e) => e.stopPropagation()}>

        {/* Header con selector y botón cerrar */}
        <div className={styles.gridModalHeader}>
          <div className={styles.headerContent}>
            <h2>Galería CDI</h2>
            <p className={styles.headerSubtitle}>
              {loading ? 'Cargando...' : `${images.length} ${images.length === 1 ? 'imagen' : 'imágenes'}`}
            </p>
          </div>

          <div className={styles.headerActions}>
            <select
              value={selectedEventFilter}
              onChange={(e) => setSelectedEventFilter(e.target.value)}
              className={styles.headerSelect}
            >
              <option value="">Todos los eventos</option>
              {eventos.map((ev) => (
                <option key={ev.id} value={ev.ruta}>
                  {ev.nombre}
                </option>
              ))}
            </select>

            <button onClick={onClose} className={styles.gridCloseButton} aria-label="Cerrar">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Grid de imágenes */}
        <div className={styles.gridModalScroll}>
          {loading ? (
            <div className={styles.emptyState}>
              <p>Cargando imágenes...</p>
            </div>
          ) : images.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No hay imágenes para mostrar</p>
            </div>
          ) : (
            <div className={styles.gridGallery}>
              {visibleImages.map((img, index) => (
                <GridImage
                  key={`${img.id}-${selectedEventFilter}`}
                  src={img.url}
                  alt={img.alt || 'Imagen de galería'}
                  onClick={() => {
                    onSelect(img.fullUrl)
                    onClose()
                  }}
                  priority={index < 4} // Priorizar las primeras 4 imágenes
                />
              ))}
            </div>
          )}

          {/* Paginación minimalista compacta */}
          {!loading && totalPages > 1 && (
            <div className={styles.paginationContainer}>
              <button
                onClick={goToPrevPage}
                disabled={page === 0}
                className={styles.pageNavButton}
                aria-label="Página anterior"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                </svg>
              </button>

              <div className={styles.pageInfo}>
                {page + 1} / {totalPages}
              </div>

              <button
                onClick={goToNextPage}
                disabled={page === totalPages - 1}
                className={styles.pageNavButton}
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