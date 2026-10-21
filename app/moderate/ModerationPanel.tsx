'use client'
import { useState } from 'react'
import ModeratorImageViewer from './ModeratorImageViewer'
import Glass, { GlassButton } from '@/components/Glass'

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
      <Glass radius={28} frost="heavy" className="p-8 text-center">
        <p className="text-white/60">No hay imágenes en esta sección.</p>
      </Glass>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {images.map((filename) => {
          const entry = urls[filename]
          if (!entry?.thumb || !entry?.original) return null

          return (
            <Glass
              key={filename}
              radius={26}
              frost="regular"
              refraction={0}
              className="group transition-transform duration-300 hover:-translate-y-0.5"
              onMouseEnter={() => setHoveredImage(filename)}
              onMouseLeave={() => setHoveredImage(null)}
            >
              <div className="relative m-2 aspect-square cursor-pointer overflow-hidden rounded-[19px]" onClick={() => setSelectedImage({ url: entry.original, filename })}>
                <img
                  src={`${entry.thumb}?t=${Date.now()}`}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {hoveredImage === filename && (
                  <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 to-transparent p-3">
                    <span className="text-sm font-medium text-white">Ver detalles</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5 px-2 pb-2">
                {actions.map((action) => (
                  <GlassButton
                    key={action.label}
                    onClick={() => action.handler(filename)}
                    size="sm"
                    radius={13}
                    refraction={0}
                    className="w-full"
                  >
                    {action.label}
                  </GlassButton>
                ))}
              </div>
            </Glass>
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