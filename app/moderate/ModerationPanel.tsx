'use client'
import { useState } from 'react'

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

  if (images.length === 0) return <p>No hay imágenes en esta sección.</p>

  return (
    <>
      <div
        style={{
          display: 'grid',
          gap: '2rem',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        }}
      >
        {images.map((filename) => {
          const entry = urls[filename]
          if (!entry?.thumb || !entry?.original) return null

          return (
            <div key={filename} style={{ border: '1px solid #ccc', padding: '1rem' }}>
              <img
                src={entry.thumb}
                alt=""
                style={{ maxWidth: '100%', maxHeight: '200px', cursor: 'pointer' }}
                onClick={() => setFullscreenUrl(entry.original)}
              />
              {actions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => action.handler(filename)}
                  style={{ marginRight: '0.5rem', marginTop: '0.5rem' }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )
        })}
      </div>

      {fullscreenUrl && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
          onClick={() => setFullscreenUrl(null)}
        >
          <img src={fullscreenUrl} alt="fullscreen" style={{ maxWidth: '90%', maxHeight: '90%' }} />
        </div>
      )}
    </>
  )
}