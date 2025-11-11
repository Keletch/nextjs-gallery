'use client'
import { useState } from 'react'
import styles from './ModeratePage.module.css'

export default function ModerationPanel({
  folder,
  images,
  urls,
  actions,
}: {
  folder: string
  images: string[]
  urls: Record<string, { thumb: string; original: string }>
  actions: { label: string; handler: (filename: string) => void }[]
}) {
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null)

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
            <div key={filename} className={styles.card}>
              <img
                src={entry.thumb}
                alt=""
                className={styles.thumb}
                onClick={() => setFullscreenUrl(entry.original)}
              />
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

      {fullscreenUrl && (
        <div className={styles.overlay} onClick={() => setFullscreenUrl(null)}>
          <img src={fullscreenUrl} alt="fullscreen" className={styles.fullscreenImage} />
        </div>
      )}
    </>
  )
}