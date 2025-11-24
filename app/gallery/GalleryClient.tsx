'use client'

import { useEffect, useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import useGallerySpeed from './UseGallerySpeed'
import FullscreenViewer from './FullscreenViewer'
import styles from './GalleryPage.module.css'

// ⚡ Lazy load de componentes pesados (Three.js)
const GalleryCanvas = dynamic(() => import('./GalleryCanvas'), {
    ssr: false,
    loading: () => <div style={{ minHeight: '100vh', background: '#0f0f0f' }} />
})

const BackgroundCanvas = dynamic(() => import('./BackgroundCanvas'), {
    ssr: false,
})

const GrainOverlay = dynamic(() => import('./GrainOverlay'), {
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
    const [logoKey, setLogoKey] = useState<number>(0)

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

    // Update logo when event changes
    useEffect(() => {
        if (!selectedEvent) {
            setLogoUrl('/cdiLogo.png')
            setLogoKey(prev => prev + 1)
            return
        }

        const evento = eventos.find(e => e.ruta === selectedEvent)
        if (evento?.logo) {
            const base = 'https://sinpfcbinaiasorunmpz.supabase.co/storage/v1/object/public/nextjsGallery'
            setLogoUrl(`${base}/logos/${evento.logo}.webp`)
            setLogoKey(prev => prev + 1)
        } else {
            setLogoUrl('/cdiLogo.png')
            setLogoKey(prev => prev + 1)
        }
    }, [selectedEvent, eventos])

    return (
        <>
            <GrainOverlay />
            <BackgroundCanvas
                selectedEvent={selectedEvent}
                color={eventos.find(e => e.ruta === selectedEvent)?.color}
            />

            <div className={styles.container}>
                <div className={styles.topBar}>
                    <select
                        value={selectedEvent}
                        onChange={(e) => setSelectedEvent(e.target.value)}
                        className={styles.select}
                    >
                        <option value="">Todos los eventos</option>
                        {eventos.map((ev) => (
                            <option key={ev.id} value={ev.ruta}>
                                {ev.nombre}
                            </option>
                        ))}
                    </select>
                    <button onClick={() => router.push('/upload')} className={styles.button}>
                        Subir imagen
                    </button>
                </div>

                <GalleryCanvas images={images} urls={urls} onSelect={handleSelect} eventId={selectedEvent} />

                {selectedImage && (
                    <FullscreenViewer hash={selectedImage} onClose={handleCloseViewer} />
                )}

                <button
                    onClick={() => setShowGridModal(true)}
                    className={styles.gridToggleButton}
                    title="Ver en cuadrícula"
                >
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                    </svg>
                </button>

                <img key={logoKey} src={logoUrl} alt="Galería" className={styles.logo} />
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