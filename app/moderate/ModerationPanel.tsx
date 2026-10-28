'use client'
import { useRef, useState } from 'react'
import ModeratorImageViewer from './ModeratorImageViewer'
import Glass, { GlassButton } from '@/components/Glass'

// Fotos por página: múltiplo de 2, 3 y 4 para que las filas de la cuadrícula queden completas
const PAGE_SIZE = 24

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
  // Versión para saltar la caché solo cuando una foto se modificó (rotar/voltear la sobrescribe en la
  // misma ruta). Antes era Date.now() en cada render: cada hover volvía a descargar todas las fotos.
  const [version, setVersion] = useState(() => Date.now())

  // Página actual por evento y carpeta: al cambiar de una a otra vuelve a la primera. Si la última
  // página se vacía (p. ej. al aprobar sus fotos) se queda en la que sí existe.
  const sectionKey = `${evento}/${folder}`
  const [paging, setPaging] = useState({ key: sectionKey, page: 0 })
  const totalPages = Math.max(1, Math.ceil(images.length / PAGE_SIZE))
  const page = Math.min(paging.key === sectionKey ? paging.page : 0, totalPages - 1)
  const pageImages = images.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const gridRef = useRef<HTMLDivElement>(null)
  const goToPage = (next: number) => {
    setPaging({ key: sectionKey, page: next })
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const chevron = (d: string) => (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  const handleCloseViewer = () => {
    setSelectedImage(null)
  }

  const handleUpdate = () => {
    setVersion(Date.now())
    onUpdate?.()
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
      <div ref={gridRef} className="grid scroll-mt-24 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {pageImages.map((filename) => {
          const entry = urls[filename]
          if (!entry?.thumb || !entry?.original) return null

          return (
            <Glass
              key={filename}
              radius={26}
              frost="regular"
              refraction={0}
              className="group transition-transform duration-300 hover:-translate-y-0.5"
            >
              <div className="relative m-2 aspect-square cursor-pointer overflow-hidden rounded-[19px]" onClick={() => setSelectedImage({ url: entry.original, filename })}>
                <img
                  src={`${entry.thumb}?v=${version}`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="text-sm font-medium text-white">Ver detalles</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 px-2 pb-2">
                {actions.map((action) => (
                  <GlassButton
                    key={action.label}
                    onClick={() => action.handler(filename)}
                    size="sm"
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

      {totalPages > 1 && (
        <Glass frost="regular" className="mx-auto mt-6 flex w-fit items-center gap-2 px-2 py-2">
          <GlassButton onClick={() => goToPage(page - 1)} disabled={page === 0} aria-label="Página anterior" className="h-9 w-9 !p-0">
            {chevron('M12.5 5l-5 5 5 5')}
          </GlassButton>
          <div className="px-3 text-sm font-medium tabular-nums">
            {page + 1} / {totalPages}
            <span className="ml-2 text-white/50">· {images.length} fotos</span>
          </div>
          <GlassButton onClick={() => goToPage(page + 1)} disabled={page === totalPages - 1} aria-label="Página siguiente" className="h-9 w-9 !p-0">
            {chevron('M7.5 5l5 5-5 5')}
          </GlassButton>
        </Glass>
      )}

      {selectedImage && (
        <ModeratorImageViewer
          imageUrl={`${selectedImage.url}?v=${version}`}
          filename={selectedImage.filename}
          evento={evento}
          folder={folder}
          onClose={handleCloseViewer}
          onUpdate={handleUpdate}
        />
      )}
    </>
  )
}