'use client'

import { useEffect, useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import useGallerySpeed from './UseGallerySpeed'
import FullscreenViewer from './FullscreenViewer'
import Noise from '@/components/Noise'

// ⚡ Lazy load de componentes pesados (Three.js)
const GalleryCanvas = dynamic(() => import('./GalleryCanvas'), {
    ssr: false,
    loading: () => <div className="min-h-screen bg-[#0f0f0f]" />
})

const BackgroundCanvas = dynamic(() => import('./BackgroundCanvas'), {
    ssr: false,
})

const GridGalleryModal = dynamic(() => import('./GridGalleryModal').then(mod => mod.GridGalleryModal), {
    ssr: false,
})

interface Evento {
    id: string
    nombre: string
    ruta: string
    color?: string
    logo?: string
}

interface GalleryItem {
    filename: string
    folder: string
}

export default function GalleryClient() {
    const [eventos, setEventos] = useState<Evento[]>([])
    const [selectedEvent, setSelectedEvent] = useState<string>('')
    const [images, setImages] = useState<string[]>([])
    const [urls, setUrls] = useState<Record<string, { thumb: string; full: string; evento: string }>>({})
    const [selectedImage, setSelectedImage] = useState<string | null>(null)

    const [showGridModal, setShowGridModal] = useState(false)
    const [logoUrl, setLogoUrl] = useState<string>('/cdiLogo.png')
    const [isLogoTransitioning, setIsLogoTransitioning] = useState(false)

    const router = useRouter()
    useGallerySpeed()

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const hash = params.get('open')
        if (hash && hash.length === 64) {
            setSelectedImage(hash)
        }
    }, [])

    const extractHash = (url: string) => {
        const filename = url.split('/').pop() || ''
        return filename.replace('.webp', '')
    }

    const handleSelect = (imageUrl: string) => {
        const hash = extractHash(imageUrl)
        window.history.pushState({}, '', `/gallery?open=${hash}`)
        setSelectedImage(hash)
    }

    const handleCloseViewer = () => {
        window.history.replaceState({}, '', '/gallery')
        setSelectedImage(null)
    }

    useEffect(() => {
        const fetchEventos = async () => {
            const res = await fetch('/api/public-events')
            const data = await res.json()
            setEventos(data)
        }
        fetchEventos()
    }, [])

    useEffect(() => {
        const fetchGallery = async () => {
            const url = selectedEvent
                ? `/api/gallery-index?evento=${selectedEvent}`
                : `/api/gallery-index`

            const res = await fetch(url)
            const list = await res.json()
            const validList = Array.isArray(list)
                ? list.filter((f: any): f is GalleryItem =>
                    f &&
                    typeof f.filename === 'string' &&
                    typeof f.folder === 'string' &&
                    f.filename.trim() !== '' &&
                    /\.(png|jpe?g|webp|gif)$/i.test(f.filename)
                )
                : []

            const base = 'https://sinpfcbinaiasorunmpz.supabase.co/storage/v1/object/public/nextjsGallery'
            const entries = validList.map(({ filename, folder }) => {
                const thumbFolder = folder.replace('/approved', '/thumbnails')
                const evento = folder.split('/')[0]

                return [
                    filename,
                    {
                        thumb: `${base}/${thumbFolder}/thumb_${filename}`,
                        full: `${base}/${folder}/${filename}`,
                        evento,
                    },
                ]
            })

            // Wrap state updates in startTransition to prevent UI freeze
            startTransition(() => {
                setImages(validList.map((item) => item.filename))
                setUrls(Object.fromEntries(entries))
            })
        }

        fetchGallery()
    }, [selectedEvent])

    // Update logo when event changes with smooth transition
    useEffect(() => {
        const updateLogo = async () => {
            // Determine new logo URL
            let newLogoUrl = '/cdiLogo.png'

            if (selectedEvent) {
                const evento = eventos.find(e => e.ruta === selectedEvent)
                if (evento?.logo) {
                    const base = 'https://sinpfcbinaiasorunmpz.supabase.co/storage/v1/object/public/nextjsGallery'
                    newLogoUrl = `${base}/logos/${evento.logo}.webp`
                }
            }

            // Skip transition if URL hasn't changed
            if (newLogoUrl === logoUrl) return

            // Trigger fade-out
            setIsLogoTransitioning(true)

            // Wait for fade-out animation (800ms for smoother effect)
            await new Promise(resolve => setTimeout(resolve, 800))

            // Change logo URL
            setLogoUrl(newLogoUrl)

            // Trigger fade-in
            setIsLogoTransitioning(false)
        }

        updateLogo()
    }, [selectedEvent, eventos, logoUrl])

    return (
        <>
            <div className="absolute inset-0 z-0" style={{ width: '100%', height: '100%' }}>
                <BackgroundCanvas
                    selectedEvent={selectedEvent}
                    color={eventos.find(e => e.ruta === selectedEvent)?.color}
                />
                <Noise patternSize={250} patternScaleX={1} patternScaleY={1} patternAlpha={15} />
            </div>

            <div className="relative h-[100dvh] w-full overflow-hidden bg-transparent text-[#eaeaea] font-mono z-0">
                <div className="absolute top-6 left-6 z-10 flex flex-wrap gap-4">
                    <select
                        value={selectedEvent}
                        onChange={(e) => setSelectedEvent(e.target.value)}
                        className="px-4 py-3 bg-white/5 backdrop-blur-xl text-[#eaeaea] border border-white/10 rounded-xl font-mono text-sm font-medium cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-white/30 hover:-translate-y-px shadow-[0_8px_32px_rgba(0,0,0,0.3)] focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    >
                        <option value="" className="bg-[#1a1a1a] text-[#eaeaea]">Todos los eventos</option>
                        {eventos.map((ev) => (
                            <option key={ev.id} value={ev.ruta} className="bg-[#1a1a1a] text-[#eaeaea]">
                                {ev.nombre}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={() => router.push('/')}
                        className="px-5 py-3 bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-xl text-white border border-purple-500/30 rounded-xl font-mono text-sm font-bold cursor-pointer transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(150,100,255,0.3)] hover:-translate-y-0.5 hover:scale-105 active:scale-95"
                    >
                        Inicio
                    </button>
                </div>

                <div className="absolute inset-0 z-0">
                    <GalleryCanvas images={images} urls={urls} onSelect={handleSelect} eventId={selectedEvent} />
                </div>

                {selectedImage && (
                    <FullscreenViewer hash={selectedImage} onClose={handleCloseViewer} />
                )}

                <button
                    onClick={() => setShowGridModal(true)}
                    className="absolute right-5 bottom-[calc(20px+min(120px,20vw)+12px)] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 cursor-pointer transition-all duration-300 z-10 text-[#eaeaea] shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/10 hover:border-white/30 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:-translate-y-1 hover:scale-110 active:scale-100"
                    title="Ver en cuadrícula"
                >
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                    </svg>
                </button>

                <img
                    src={logoUrl}
                    alt="Galería"
                    className={`absolute bottom-5 right-5 w-[min(120px,20vw)] h-auto opacity-80 pointer-events-none z-10 transition-all duration-700 ease-in-out drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)] hover:scale-105 hover:opacity-100 ${isLogoTransitioning ? 'opacity-0 blur-md scale-95' : 'opacity-80 blur-0 scale-100'}`}
                />
            </div>

            {showGridModal && (
                <GridGalleryModal
                    initialImages={images.map((id) => ({
                        id,
                        url: urls[id]?.thumb || '',
                        fullUrl: urls[id]?.full || '',
                        alt: urls[id]?.evento || '',
                    }))}
                    initialEvent={selectedEvent}
                    eventos={eventos}
                    onSelect={(fullUrl: string) => handleSelect(fullUrl)}
                    onClose={() => setShowGridModal(false)}
                />
            )}
        </>
    )
}