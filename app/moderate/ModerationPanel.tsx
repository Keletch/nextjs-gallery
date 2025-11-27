'use client'
import { useState } from 'react'
import ModeratorImageViewer from './ModeratorImageViewer'

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
    return (
      <div className="p-8 text-center bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <p className="text-white/70 font-mono">No hay imágenes en esta sección.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {images.map((filename) => {
          const entry = urls[filename]
          if (!entry?.thumb || !entry?.original) return null

          return (
            <div
              key={filename}
              className="group relative bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-300 hover:shadow-[0_20px_60px_rgba(0,255,200,0.4)] hover:border-cyan-500/40"
              onMouseEnter={() => setHoveredImage(filename)}
              onMouseLeave={() => setHoveredImage(null)}
            >
              <div className="relative aspect-square cursor-pointer overflow-hidden" onClick={() => setSelectedImage({ url: entry.original, filename })}>
                <img
                  src={`${entry.thumb}?t=${Date.now()}`}
                  alt=""
                  className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
                />
                {hoveredImage === filename && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-center">
                    <span className="text-white font-mono text-sm font-semibold drop-shadow-lg">Ver detalles</span>
                  </div>
                )}
              </div>
              <div className="p-3 flex flex-col gap-2">
                {actions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => action.handler(filename)}
                    className="px-4 py-2 rounded-lg font-mono text-sm font-semibold text-white bg-gradient-to-r from-cyan-500/20 to-green-500/20 border border-cyan-500/30 cursor-pointer transition-all duration-300 hover:from-cyan-500/30 hover:to-green-500/30 hover:scale-105 shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
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