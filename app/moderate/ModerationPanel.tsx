'use client'
import { useState } from 'react'
import ModeratorImageViewer from './ModeratorImageViewer'
import styles from './ModeratePage.module.css'

export default function ModerationPanel({
  folder,
  images,
  urls,
  actions,
  evento,
  onUpdate,
}: {
  folder: 'pending' | 'approved' | 'rejected'
  images: string[]
  urls: Record<string, { thumb: string; original: string }>
  actions: { label: string; handler: (filename: string) => void }[]
  evento: string
  onUpdate?: () => void
}) {
  const [selectedImage, setSelectedImage] = useState<{
    url: string
    filename: string
  } | null>(null)
  const [hoveredImage, setHoveredImage] = useState<string | null>(null)

  const handleCloseViewer = () => {
    setSelectedImage(null)
  }

  if (images.length === 0) {
    return <p className={styles.status}>No hay imágenes en esta sección.</p>
  }

  return (
    <>
      <div className={styles.grid}>
        {images.map((filename) => {
          const entry = urls[filename]
          if (!entry?.thumb || !entry?.original) return null

          return (
            <div
              key={filename}
              className={styles.card}
              onMouseEnter={() => setHoveredImage(filename)}
              onMouseLeave={() => setHoveredImage(null)}
            >
              <div className={styles.thumbWrapper}>
                <img
                  src={`${entry.thumb}?t=${Date.now()}`}
                  alt=""
                  className={styles.thumb}
                  onClick={() => setSelectedImage({ url: entry.original, filename })}
                />
                {hoveredImage === filename && (
                  <div className={styles.thumbOverlay}>
                    <span>👁️ Ver detalles y editar</span>
                  </div>
                )}
              </div>
              <div className={styles.buttonGroup}>
                {actions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => action.handler(filename)}
                    className={styles.actionButton}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {selectedImage && (
        <ModeratorImageViewer
          imageUrl={`${selectedImage.url}?t=${Date.now()}`}
          filename={selectedImage.filename}
          evento={evento}
          folder={folder}
          onClose={handleCloseViewer}
          onUpdate={onUpdate}
        />
      )}
    </>
  )
}