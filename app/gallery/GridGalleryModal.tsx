'use client'

import { useState, useEffect, useMemo } from 'react'
import styles from './GalleryPage.module.css'

type GridGalleryModalProps = {
  images: { id: string; url: string; fullUrl: string; alt?: string }[]
  eventos: { id: string; nombre: string; ruta: string }[]
  onSelect: (fullUrl: string) => void
  onClose: () => void
}

export function GridGalleryModal({ images, eventos, onSelect, onClose }: GridGalleryModalProps) {
  const [page, setPage] = useState(0)
  const [loaded, setLoaded] = useState<Set<string>>(new Set())
  const [isMobile, setIsMobile] = useState(false)
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('')

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const IMAGES_PER_PAGE = isMobile ? 6 : 8

  // ✅ Filtrar imágenes por evento
  const filteredImages = useMemo(() => {
    if (!selectedEventFilter) return images
    return images.filter(img => img.alt === selectedEventFilter)
  }, [images, selectedEventFilter])

  const totalPages = Math.ceil(filteredImages.length / IMAGES_PER_PAGE)
  const visibleImages = useMemo(
    () => filteredImages.slice(page * IMAGES_PER_PAGE, (page + 1) * IMAGES_PER_PAGE),
    [filteredImages, page, IMAGES_PER_PAGE]
  )

  // ✅ Generar key único para forzar recarga cuando cambien imágenes
  const imagesKey = useMemo(() => 
    `${selectedEventFilter}-${page}-${visibleImages.map(img => img.id).join('-')}`,
    [selectedEventFilter, page, visibleImages]
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
    setLoaded(new Set())
  }, [selectedEventFilter])

  // ✅ Reset loaded cuando cambian las imágenes visibles
  useEffect(() => {
    setLoaded(new Set())
    
    // Precargar imágenes con timeout
    const timeouts: NodeJS.Timeout[] = []
    
    visibleImages.forEach((img) => {
      const preloadImg = new Image()
      preloadImg.src = img.url
      
      preloadImg.onload = () => {
        setLoaded((prev) => new Set(prev).add(img.id))
      }
      
      preloadImg.onerror = () => {
        console.warn(`Error cargando imagen: ${img.url}`)
        setLoaded((prev) => new Set(prev).add(img.id)) // Marcar como "cargada" para quitar spinner
      }
      
      // Timeout de 8 segundos
      const timeout = setTimeout(() => {
        setLoaded((prev) => {
          if (!prev.has(img.id)) {
            console.warn(`Timeout cargando: ${img.url}`)
            return new Set(prev).add(img.id)
          }
          return prev
        })
      }, 8000)
      
      timeouts.push(timeout)
    })
    
    return () => {
      timeouts.forEach(clearTimeout)
    }
  }, [visibleImages])

  const handleImageLoad = (id: string) => {
    setLoaded((prev) => new Set(prev).add(id))
  }

  const handleImageError = (id: string, url: string) => {
    console.error(`Error cargando imagen: ${url}`)
    setLoaded((prev) => new Set(prev).add(id))
  }

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
              {filteredImages.length} {filteredImages.length === 1 ? 'imagen' : 'imágenes'}
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
          {filteredImages.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No hay imágenes para mostrar</p>
            </div>
          ) : (
            <div className={styles.gridGallery} key={imagesKey}>
              {visibleImages.map((img) => (
                <div 
                  key={`${img.id}-${selectedEventFilter}`}
                  className={styles.gridCell}
                  onClick={() => {
                    onSelect(img.fullUrl)
                    onClose()
                  }}
                >
                  <div className={styles.gridCellInner}>
                    {!loaded.has(img.id) && (
                      <div className={styles.gridCellLoading}>
                        <div className={styles.spinner} />
                      </div>
                    )}
                    <img
                      src={img.url}
                      alt={img.alt || 'Imagen de galería'}
                      className={styles.gridImage}
                      loading="eager"
                      onLoad={() => handleImageLoad(img.id)}
                      onError={() => handleImageError(img.id, img.url)}
                      style={{ opacity: loaded.has(img.id) ? 1 : 0 }}
                    />
                    <div className={styles.gridCellOverlay}>
                      <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paginación minimalista compacta */}
          {totalPages > 1 && (
            <div className={styles.paginationContainer}>
              <button
                onClick={goToPrevPage}
                disabled={page === 0}
                className={styles.pageNavButton}
                aria-label="Página anterior"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
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
                  <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}