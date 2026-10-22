'use client'

import { useEffect, useMemo, useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import useGallerySpeed from './UseGallerySpeed'
import FullscreenViewer from './FullscreenViewer'
import DriftWall, { type DriftWallItem } from '@/components/DriftWall'
import Glass, { GlassButton, GlassSelect } from '@/components/Glass'

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
    destacado?: boolean
}

interface GalleryItem {
    filename: string
    folder: string
}

type ViewMode = 'wall' | 'flight'
const VIEW_MODE_KEY = 'gallery:viewMode'

function shuffle<T>(arr: T[]): T[] {
    const out = [...arr]
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]]
    }
    return out
}

// Composición del muro: se sortea en cada recarga para que la galería no se vea siempre igual
type WallComposition = {
    kind: 'columnas' | 'filas' | 'diagonal'
    orientation: 'vertical' | 'horizontal'
    /** Giro del muro completo (diagonal) */
    roll: number
    /** Inclinación y giro de la cámara */
    tilt: number
    turn: number
    direction: 'up' | 'down'
    /** Densidad 0–1: 0 = pocas columnas grandes, 1 = muchas pequeñas (dentro del rango de la pantalla) */
    density: number
}

const KINDS = ['columnas', 'filas', 'diagonal'] as const

function randomComposition(): WallComposition {
    const sign = () => (Math.random() < 0.5 ? -1 : 1)
    // Solo en desarrollo: ?muro=columnas|filas|diagonal fuerza el tipo para probarlo
    const forced = process.env.NODE_ENV !== 'production' && typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('muro')
        : null
    const kind = KINDS.find(k => k === forced) ?? KINDS[Math.floor(Math.random() * KINDS.length)]
    // Promedio de dos sorteos: carga hacia el medio, los extremos salen de vez en cuando
    // (en desarrollo, ?densidad=min|max fuerza un extremo para probarlo)
    const forcedDensity = process.env.NODE_ENV !== 'production' && typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('densidad')
        : null
    const density = forcedDensity === 'min' ? 0 : forcedDensity === 'max' ? 1 : (Math.random() + Math.random()) / 2
    return {
        kind,
        orientation: kind === 'filas' || (kind === 'diagonal' && Math.random() < 0.5) ? 'horizontal' : 'vertical',
        roll: kind === 'diagonal' ? sign() * (15 + Math.random() * 20) : 0,
        tilt: sign() * (8 + Math.random() * 10),
        turn: sign() * (6 + Math.random() * 10),
        direction: Math.random() < 0.5 ? 'up' : 'down',
        density,
    }
}

// Rango de columnas (vistas de frente) y tamaño mínimo de foto por tipo de pantalla
function densityRange(width: number) {
    if (width < 640) return { min: 2, max: 4, minTile: 85 }
    if (width < 1024) return { min: 3, max: 5, minTile: 110 }
    if (width < 1600) return { min: 4, max: 6, minTile: 150 }
    if (width < 2400) return { min: 4, max: 7, minTile: 190 }
    return { min: 5, max: 8, minTile: 230 }
}

const MAX_SLOT = 440 // foto de ~400 px como máximo

function tileSizeFor(width: number, columns: number) {
    // Cada columna (ficha + espacio) ocupa su parte del ~82% del ancho; la escala y la perspectiva completan el resto
    const slot = Math.min(MAX_SLOT, (width * 0.82) / columns)
    const gap = Math.round(Math.min(26, Math.max(10, slot * 0.09)))
    return { tileWidth: Math.round(slot - gap), gap }
}

// Tamaño del muro según la pantalla: fichas proporcionales al ancho y carriles suficientes para
// llenarla (en diagonal se cubre la proyección de la pantalla rotada, esquinas incluidas)
function wallLayout(width: number, height: number, composition: WallComposition) {
    // Columnas según la densidad sorteada, sin bajar del tamaño mínimo de foto de esta pantalla
    const range = densityRange(width)
    let maxColumns = range.max
    while (maxColumns > range.min && tileSizeFor(width, maxColumns).tileWidth < range.minTile) maxColumns--
    const sizeColumns = range.min + Math.round(composition.density * (maxColumns - range.min))
    const { tileWidth, gap } = tileSizeFor(width, sizeColumns)
    const tileHeight = Math.round(tileWidth * 0.66)

    const vertical = composition.orientation === 'vertical'
    const laneSize = (vertical ? tileWidth : tileHeight) + gap
    let lanes: number
    if (composition.roll === 0) {
        // Filas: cubren todo el alto (arriba y abajo ya hay desvanecido). Una fila extra de margen porque
        // con la inclinación y el giro de cámara el lado lejano se encoge y dejaba esquinas sin cubrir
        lanes = vertical ? sizeColumns : Math.max(2, Math.ceil((height * 0.95) / laneSize) + 1)
    } else {
        const rad = (composition.roll * Math.PI) / 180
        const crossLen = vertical ? width : height
        const mainLen = vertical ? height : width
        const required = crossLen * Math.abs(Math.cos(rad)) + mainLen * Math.abs(Math.sin(rad))
        // +3 de margen: con la perspectiva el lado lejano se encoge y las esquinas quedaban al límite
        lanes = Math.ceil(required / laneSize) + 3
    }
    return { columns: lanes, tileWidth, tileHeight, gap }
}

export default function GalleryClient() {
    const [eventos, setEventos] = useState<Evento[]>([])
    const [selectedEvent, setSelectedEvent] = useState<string>('')
    const [images, setImages] = useState<string[]>([])
    const [urls, setUrls] = useState<Record<string, { thumb: string; full: string; evento: string }>>({})
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    // Evento cuyas fotos ya terminaron de cargar (para no mostrar "sin fotos" mientras carga)
    const [loadedEvent, setLoadedEvent] = useState<string | null>(null)

    const [showGridModal, setShowGridModal] = useState(false)
    const [logoUrl, setLogoUrl] = useState<string>('/cdiLogo.png')
    const [isLogoTransitioning, setIsLogoTransitioning] = useState(false)
    const [eventosLoaded, setEventosLoaded] = useState(false)
    const [viewMode, setViewMode] = useState<ViewMode>('wall')
    // Solo afecta al muro, que se renderiza en el cliente después de cargar las fotos
    const [viewportWidth, setViewportWidth] = useState(() => typeof window === 'undefined' ? 1280 : window.innerWidth)
    const [viewportHeight, setViewportHeight] = useState(() => typeof window === 'undefined' ? 800 : window.innerHeight)
    // Una composición por visita (el muro solo se renderiza en el cliente, no afecta la hidratación)
    const [composition] = useState(randomComposition)

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

    // Recordar el modo elegido (solo en este navegador)
    useEffect(() => {
        try {
            const saved = localStorage.getItem(VIEW_MODE_KEY)
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (saved === 'wall' || saved === 'flight') setViewMode(saved)
        } catch { }
    }, [])

    const changeViewMode = (next: ViewMode) => {
        setViewMode(next)
        try { localStorage.setItem(VIEW_MODE_KEY, next) } catch { }
    }

    useEffect(() => {
        const update = () => {
            setViewportWidth(window.innerWidth)
            setViewportHeight(window.innerHeight)
        }
        window.addEventListener('resize', update)
        return () => window.removeEventListener('resize', update)
    }, [])

    useEffect(() => {
        const fetchEventos = async () => {
            try {
                const res = await fetch('/api/public-events')
                const data: Evento[] = await res.json()
                setEventos(Array.isArray(data) ? data : [])

                // Abrir el evento destacado por moderación; si no hay, se queda en "Todos los eventos"
                const destacado = Array.isArray(data) ? data.find(e => e.destacado) : undefined
                if (destacado) setSelectedEvent(destacado.ruta)
            } finally {
                setEventosLoaded(true)
            }
        }
        fetchEventos()
    }, [])

    useEffect(() => {
        // Esperar a saber si hay evento destacado para no cargar "Todos" y luego cambiar
        if (!eventosLoaded) return

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
                setLoadedEvent(selectedEvent)
            })
        }

        fetchGallery()
    }, [selectedEvent, eventosLoaded])

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

    // Fichas del muro: barajadas cada vez que cambia la lista para que no salgan siempre en el mismo orden
    const wallItems = useMemo<DriftWallItem[]>(() => {
        const nombres = new Map(eventos.map(e => [e.ruta, e.nombre]))
        return shuffle(images)
            .filter(filename => urls[filename]?.thumb)
            .map(filename => ({
                id: filename,
                image: urls[filename].thumb,
                title: nombres.get(urls[filename].evento) ?? 'Foto de la galería',
            }))
    }, [images, urls, eventos])

    const layout = wallLayout(viewportWidth, viewportHeight, composition)

    // Con el modal o el visor abiertos se pausa lo de atrás: su vidrio grande recalculaba refracción y
    // desenfoque en cada cuadro sobre contenido en movimiento (bajaba a ~5 fps)
    const overlayOpen = showGridModal || selectedImage !== null

    return (
        <>
            <div className="absolute inset-0 z-0" style={{ width: '100%', height: '100%' }}>
                <BackgroundCanvas
                    selectedEvent={selectedEvent}
                    color={eventos.find(e => e.ruta === selectedEvent)?.color}
                    paused={overlayOpen}
                />
            </div>

            <div className="relative h-[100dvh] w-full overflow-hidden bg-transparent text-white z-0" style={{ transform: 'translate3d(0,0,0)' }}>
                {/* Barra flotante de vidrio */}
                <Glass radius={26} frost="clear" refraction={36} className="absolute left-4 right-4 top-4 z-10 flex flex-wrap items-center gap-2 p-2 sm:left-6 sm:right-auto sm:top-6">
                    <GlassSelect
                        value={selectedEvent}
                        onChange={(e) => setSelectedEvent(e.target.value)}
                        className="min-w-[190px] flex-1 text-sm sm:flex-none"
                    >
                        <option value="">Todos los eventos</option>
                        {eventos.map((ev) => (
                            <option key={ev.id} value={ev.ruta}>
                                {ev.nombre}
                            </option>
                        ))}
                    </GlassSelect>

                    {/* Control segmentado de vista */}
                    <div role="radiogroup" aria-label="Vista" className="flex rounded-[14px] bg-black/20 p-1">
                        {([['wall', 'Muro'], ['flight', 'Vuelo']] as const).map(([mode, label]) => (
                            <GlassButton
                                key={mode}
                                role="radio"
                                aria-checked={viewMode === mode}
                                size="sm"
                                radius={10}
                                selected={viewMode === mode}
                                onClick={() => changeViewMode(mode)}
                                className={viewMode === mode ? '' : '!bg-transparent !shadow-none text-white/65'}
                            >
                                {label}
                            </GlassButton>
                        ))}
                    </div>

                    <GlassButton onClick={() => router.push('/')}>Inicio</GlassButton>
                </Glass>

                <div className="absolute inset-0 z-0">
                    {viewMode === 'wall' ? (
                        wallItems.length > 0 ? (
                            <DriftWall
                                items={wallItems}
                                columns={layout.columns}
                                orientation={composition.orientation}
                                roll={composition.roll}
                                tilt={composition.tilt}
                                turn={composition.turn}
                                direction={composition.direction}
                                tileWidth={layout.tileWidth}
                                tileHeight={layout.tileHeight}
                                gap={layout.gap}
                                dim={1}
                                overlayOpacity={0}
                                fade={0.15}
                                parallax={0}
                                lift={0}
                                paused={overlayOpen}
                                onItemClick={(item) => item.id && urls[item.id] && handleSelect(urls[item.id].full)}
                            />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-white/50 text-sm">
                                {loadedEvent === selectedEvent ? 'Aún no hay fotos en este evento' : 'Cargando fotos…'}
                            </div>
                        )
                    ) : (
                        <GalleryCanvas images={images} urls={urls} onSelect={handleSelect} eventId={selectedEvent} paused={overlayOpen} />
                    )}
                </div>

                {selectedImage && (
                    <FullscreenViewer hash={selectedImage} onClose={handleCloseViewer} />
                )}

                <GlassButton
                    onClick={() => setShowGridModal(true)}
                    radius={999}
                    aria-label="Ver en cuadrícula"
                    title="Ver en cuadrícula"
                    className="!absolute right-5 bottom-[calc(20px+min(120px,20vw)+12px)] z-10 h-12 w-12 !p-0"
                >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
                        <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" />
                        <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" />
                        <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" />
                    </svg>
                </GlassButton>

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