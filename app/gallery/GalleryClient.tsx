'use client'

import { useEffect, useMemo, useRef, useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import useGallerySpeed from './UseGallerySpeed'
import FullscreenViewer from './FullscreenViewer'
import DriftWall, { type DriftWallItem } from '@/components/DriftWall'
import DomeGallery from '@/components/DomeGallery'
import { ChevronDown, ChevronRight, House, ImagePlus } from 'lucide-react'
import Glass, { GlassButton, GlassSelect } from '@/components/Glass'
import { supabaseClient } from '@/lib/supabase-client'

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

// Duración del desvanecido del logo al cambiar de evento (coincide con duration-500)
const LOGO_FADE_MS = 500

type ViewMode = 'wall' | 'dome' | 'flight'
const VIEW_MODE_KEY = 'gallery:viewMode'
const DOME_SHUFFLE_KEY = 'gallery:domeShuffle'
// Salida fade + blur de la vista al cambiar entre Muro, Globo y Vuelo
const VIEW_EXIT_MS = 400
const VIEW_LABELS: Record<ViewMode, string> = { wall: 'Muro', dome: 'Globo', flight: 'Vuelo' }

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
    kind: 'columnas' | 'filas'
    orientation: 'vertical' | 'horizontal'
    /** Inclinación y giro de la cámara */
    tilt: number
    turn: number
    direction: 'up' | 'down'
    /** Densidad 0–1: 0 = pocas columnas grandes, 1 = muchas pequeñas (dentro del rango de la pantalla) */
    density: number
    /** Sorteo 0–1 de tamaño y velocidad de cada carril (fijo por visita para que no cambie al redimensionar) */
    laneDraws: { size: number; speed: number }[]
}

const KINDS = ['columnas', 'filas'] as const
const MAX_LANES = 40

function randomComposition(): WallComposition {
    const sign = () => (Math.random() < 0.5 ? -1 : 1)
    // Solo en desarrollo: ?muro=columnas|filas fuerza el tipo para probarlo
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
        orientation: kind === 'filas' ? 'horizontal' : 'vertical',
        tilt: sign() * (8 + Math.random() * 10),
        turn: sign() * (6 + Math.random() * 10),
        direction: Math.random() < 0.5 ? 'up' : 'down',
        density,
        laneDraws: Array.from({ length: MAX_LANES }, () => ({ size: Math.random(), speed: Math.random() })),
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
// Tres tamaños de carril (lejano, medio, cercano) en vez de un tamaño continuo al azar: se lee como
// capas de profundidad. La velocidad va con el tamaño (paralaje: lo cercano pasa más rápido), con un
// poco de variación para que dos carriles iguales no vayan sincronizados. Tope 1.45×, el de antes.
const LANE_TIERS = [
    { scale: 0.8, speed: 0.55 },
    { scale: 1, speed: 0.9 },
    { scale: 1.25, speed: 1.3 },
]
const LANE_SPEED_JITTER = 0.15
const MAX_TILE = 520

function tileSizeFor(width: number, columns: number) {
    // Cada columna (ficha + espacio) ocupa su parte del ~82% del ancho; la escala y la perspectiva completan el resto
    const slot = Math.min(MAX_SLOT, (width * 0.82) / columns)
    const gap = Math.round(Math.min(26, Math.max(10, slot * 0.09)))
    return { tileWidth: Math.round(slot - gap), gap }
}

// Tamaño del muro según la pantalla: foto base según la densidad sorteada y carriles de tamaños
// irregulares hasta cubrir la pantalla
function wallLayout(width: number, height: number, composition: WallComposition) {
    // Tamaño de foto según la densidad sorteada (expresada como columnas vistas de frente),
    // sin bajar del tamaño mínimo de foto de esta pantalla
    const range = densityRange(width)
    let maxColumns = range.max
    while (maxColumns > range.min && tileSizeFor(width, maxColumns).tileWidth < range.minTile) maxColumns--
    const sizeColumns = range.min + Math.round(composition.density * (maxColumns - range.min))
    const { tileWidth, gap } = tileSizeFor(width, sizeColumns)
    const tileHeight = Math.round(tileWidth * 0.66)

    const vertical = composition.orientation === 'vertical'
    const baseLane = vertical ? tileWidth : tileHeight
    // Ningún carril baja del mínimo de la pantalla ni pasa del máximo
    const minScale = range.minTile / tileWidth
    const maxScale = Math.max(minScale, MAX_TILE / tileWidth)

    // Filas: cubren todo el alto (arriba y abajo ya hay desvanecido), con margen porque con la inclinación
    // y el giro de cámara el lado lejano se encoge. En PC las columnas también cubren todo el ancho; en
    // celular y tablet se mantiene el ~82% de antes (la escala y la perspectiva completan el resto).
    const fillScreen = width >= 1024
    const target = vertical
        ? fillScreen ? width + baseLane + gap : width * 0.82
        : fillScreen ? height + 2 * (baseLane + gap) : height * 0.95 + baseLane + gap

    const lanes: { scale: number; speed: number }[] = []
    let prevTier = -1
    let covered = 0
    while ((covered < target || lanes.length < 2) && lanes.length < MAX_LANES) {
        const draw = composition.laneDraws[lanes.length]
        // Dos carriles vecinos nunca del mismo tamaño (así se notan las capas): se sortea entre los otros dos
        const options = [0, 1, 2].filter(t => t !== prevTier)
        const tier = options[Math.min(options.length - 1, Math.floor(draw.size * options.length))]
        prevTier = tier
        // Si la capa lejana quedaría bajo el mínimo de la pantalla, subir las tres juntas en vez de
        // aplastar la lejana contra la media
        const lift = Math.max(0, minScale - LANE_TIERS[0].scale)
        const scale = Math.min(maxScale, LANE_TIERS[tier].scale + lift)
        lanes.push({ scale, speed: LANE_TIERS[tier].speed + (draw.speed - 0.5) * 2 * LANE_SPEED_JITTER })
        covered += baseLane * scale + gap
    }
    return { lanes, tileWidth, tileHeight, gap }
}

export default function GalleryClient({ defaultView = 'wall', eventos }: { defaultView?: ViewMode; eventos: Evento[] }) {
    // Eventos y evento destacado llegan del servidor: el selector arranca ya en el destacado (antes se
    // pedían en el navegador y se veía "Todos los eventos" y luego cambiaba). Sin destacado: todos
    const [selectedEvent, setSelectedEvent] = useState<string>(() => eventos.find(e => e.destacado)?.ruta ?? '')
    const [images, setImages] = useState<string[]>([])
    const [urls, setUrls] = useState<Record<string, { thumb: string; full: string; evento: string }>>({})
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    // Evento cuyas fotos ya terminaron de cargar (para no mostrar "sin fotos" mientras carga)
    const [loadedEvent, setLoadedEvent] = useState<string | null>(null)

    const [showGridModal, setShowGridModal] = useState(false)
    // Sin logo hasta saber cuál va (el del evento destacado o el del Club): antes salía el del Club y
    // luego se cambiaba al del destacado
    const [logoUrl, setLogoUrl] = useState<string>('')
    const [isLogoTransitioning, setIsLogoTransitioning] = useState(true)
    const logoUrlRef = useRef('')
    // Arranca en la vista que eligió el moderador (ver app/moderate/DefaultViewPanel)
    const [viewMode, setViewMode] = useState<ViewMode>(defaultView)
    // Globo: fotos fijas o cambiando sin parar
    const [domeShuffle, setDomeShuffle] = useState(true)
    // Menú de vista (Muro / Globo / Vuelo): dónde se abre (null = cerrado) y si muestra el submenú del
    // globo (Fijo / Vivo) a un lado
    const [viewMenuAt, setViewMenuAt] = useState<{ left: number; top: number } | null>(null)
    const [domeSubmenu, setDomeSubmenu] = useState(false)
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

    // Recordar el modo elegido solo durante la visita (sessionStorage): en una visita nueva la galería
    // vuelve a abrir en la vista que eligió el moderador
    useEffect(() => {
        try {
            const saved = sessionStorage.getItem(VIEW_MODE_KEY)
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (saved === 'wall' || saved === 'dome' || saved === 'flight') setViewMode(saved)
            if (localStorage.getItem(DOME_SHUFFLE_KEY) === 'fijo') setDomeShuffle(false)
        } catch { }
    }, [])

    const changeDomeShuffle = (next: boolean) => {
        setDomeShuffle(next)
        setViewMenuAt(null)
        try { localStorage.setItem(DOME_SHUFFLE_KEY, next ? 'vivo' : 'fijo') } catch { }
    }

    const [viewLeaving, setViewLeaving] = useState(false)
    const viewSwapRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const toggleViewMenu = (button: HTMLElement) => {
        if (viewMenuAt) return setViewMenuAt(null)
        const r = button.getBoundingClientRect()
        // Menú + submenú miden ~250 px: en pantallas angostas se corre a la izquierda para que quepan
        setViewMenuAt({ left: Math.max(12, Math.min(r.left, window.innerWidth - 262)), top: r.bottom + 10 })
        // El submenú del globo solo aparece al pasar sobre Globo (o tocarlo en celular)
        setDomeSubmenu(false)
    }

    const changeViewMode = (next: ViewMode) => {
        // Globo abre su submenú (Fijo / Vivo) y el menú sigue abierto; las otras vistas lo cierran
        if (next === 'dome') setDomeSubmenu(true)
        else setViewMenuAt(null)
        if (next === viewMode && !viewSwapRef.current) return
        try { sessionStorage.setItem(VIEW_MODE_KEY, next) } catch { }
        // La vista actual sale con fade + blur y luego entra la nueva (con su propia entrada)
        if (viewSwapRef.current) clearTimeout(viewSwapRef.current)
        setViewLeaving(true)
        viewSwapRef.current = setTimeout(() => {
            viewSwapRef.current = null
            setViewMode(next)
            setViewLeaving(false)
        }, VIEW_EXIT_MS)
    }
    useEffect(() => () => { if (viewSwapRef.current) clearTimeout(viewSwapRef.current) }, [])

    useEffect(() => {
        const update = () => {
            setViewportWidth(window.innerWidth)
            setViewportHeight(window.innerHeight)
        }
        window.addEventListener('resize', update)
        return () => window.removeEventListener('resize', update)
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
                // Barajada una vez al cargar: las fotos aprobadas en vivo se suman al final sin revolver el muro
                setImages(shuffle(validList.map((item) => item.filename)))
                setUrls(Object.fromEntries(entries))
                setLoadedEvent(selectedEvent)
            })
        }

        fetchGallery()
    }, [selectedEvent])

    // Cambio de logo al cambiar de evento: se desvanece el actual mientras el nuevo se descarga y
    // decodifica; recién con el nuevo listo se cambia y aparece (antes se cambiaba antes de cargar
    // y se veía el logo viejo nítido y luego el nuevo de golpe)
    useEffect(() => {
        let newLogoUrl = '/cdiLogo.png'
        if (selectedEvent) {
            const evento = eventos.find(e => e.ruta === selectedEvent)
            if (evento?.logo) {
                const base = 'https://sinpfcbinaiasorunmpz.supabase.co/storage/v1/object/public/nextjsGallery'
                newLogoUrl = `${base}/logos/${evento.logo}.webp`
            }
        }
        if (newLogoUrl === logoUrlRef.current) {
            // Mismo logo (p. ej. se volvió al evento anterior a media transición): asegurar que se vea
            setIsLogoTransitioning(false)
            return
        }

        let cancelled = false
        setIsLogoTransitioning(true)

        const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))
        const preload = new Image()
        // load siempre se dispara; decode() puede quedar pendiente si la pestaña no se está pintando,
        // así que se intenta con tope. Si la red falla o tarda, a los 2.5 s se cambia igual.
        const loaded = new Promise<void>(resolve => {
            preload.onload = preload.onerror = () => resolve()
        })
        preload.src = newLogoUrl
        const ready = Promise.race([
            loaded.then(() => Promise.race([preload.decode().catch(() => undefined), wait(300)])),
            wait(2500),
        ])
        // El primero no espera el desvanecido: no hay logo anterior que ocultar
        Promise.all([ready, wait(logoUrlRef.current ? LOGO_FADE_MS : 0)]).then(() => {
            if (cancelled) return
            logoUrlRef.current = newLogoUrl
            setLogoUrl(newLogoUrl)
            // Mostrar un instante después, ya con la imagen nueva puesta (un temporizador y no
            // requestAnimationFrame: en pestañas en segundo plano rAF puede no ejecutarse y el logo quedaba oculto)
            setTimeout(() => {
                if (!cancelled) setIsLogoTransitioning(false)
            }, 30)
        })

        // Si se cambia de evento otra vez antes de terminar, esta transición se descarta
        return () => {
            cancelled = true
        }
    }, [selectedEvent, eventos])

    // Fotos en vivo: al aprobarse una foto (aprobada_en) aparece sin recargar; si se rechaza, se quita.
    // El evento se lee de una ref para no volver a suscribirse en cada cambio de evento.
    const loadedEventRef = useRef(loadedEvent)
    useEffect(() => { loadedEventRef.current = loadedEvent }, [loadedEvent])

    // Pestaña oculta (otra pestaña o ventana minimizada): todo se congela y los cambios en vivo se
    // guardan para aplicarse al volver, así la galería no cambia de golpe a espaldas del usuario
    const [tabHidden, setTabHidden] = useState(false)
    const pendingLiveRef = useRef<(() => void)[]>([])
    useEffect(() => {
        const onVisibility = () => {
            setTabHidden(document.hidden)
            if (!document.hidden) {
                const pending = pendingLiveRef.current
                pendingLiveRef.current = []
                pending.forEach(apply => apply())
            }
        }
        document.addEventListener('visibilitychange', onVisibility)
        return () => document.removeEventListener('visibilitychange', onVisibility)
    }, [])

    useEffect(() => {
        const base = 'https://sinpfcbinaiasorunmpz.supabase.co/storage/v1/object/public/nextjsGallery'
        const channel = supabaseClient
            .channel('fotos-aprobadas')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'imageInfo' }, ({ new: row }) => {
                const { imghash, evento, aprobada_en } = row as { imghash: string; evento: string; aprobada_en: string | null }
                const shown = loadedEventRef.current
                if (shown === null || (shown !== '' && evento !== shown)) return
                const filename = `${imghash}.webp`
                const apply = () => {
                    if (aprobada_en) {
                        setUrls(prev => prev[filename] ? prev : {
                            ...prev,
                            [filename]: {
                                thumb: `${base}/${evento}/thumbnails/thumb_${filename}`,
                                full: `${base}/${evento}/approved/${filename}`,
                                evento,
                            },
                        })
                        setImages(prev => prev.includes(filename) ? prev : [...prev, filename])
                    } else {
                        setImages(prev => prev.filter(f => f !== filename))
                    }
                }
                if (document.hidden) pendingLiveRef.current.push(apply)
                else apply()
            })
            .subscribe()
        return () => { supabaseClient.removeChannel(channel) }
    }, [])

    // Fichas del muro (la lista ya viene barajada al cargar)
    const wallItems = useMemo<DriftWallItem[]>(() => {
        const nombres = new Map(eventos.map(e => [e.ruta, e.nombre]))
        return images
            .filter(filename => urls[filename]?.thumb)
            .map(filename => ({
                id: filename,
                image: urls[filename].thumb,
                title: nombres.get(urls[filename].evento) ?? 'Foto de la galería',
            }))
    }, [images, urls, eventos])

    const layout = useMemo(() => wallLayout(viewportWidth, viewportHeight, composition), [viewportWidth, viewportHeight, composition])

    // Con el modal o el visor abiertos se pausa lo de atrás: su vidrio grande recalculaba refracción y
    // desenfoque en cada cuadro sobre contenido en movimiento (bajaba a ~5 fps)
    const overlayOpen = showGridModal || selectedImage !== null
    const frozen = overlayOpen || tabHidden

    return (
        <>
            <div className="absolute inset-0 z-0" style={{ width: '100%', height: '100%' }}>
                <BackgroundCanvas
                    selectedEvent={selectedEvent}
                    color={eventos.find(e => e.ruta === selectedEvent)?.color}
                    paused={frozen}
                />
            </div>

            <div className="relative h-[100dvh] w-full overflow-hidden bg-transparent text-white z-0" style={{ transform: 'translate3d(0,0,0)' }}>
                {/* Barra flotante de vidrio. Barra y controles en píldora: con el mismo margen interno quedan
                    concéntricos (radio de afuera = radio de adentro + margen) */}
                <Glass radius={999} frost="clear" refraction={36} className="absolute left-3 right-3 top-3 z-10 flex flex-wrap items-center gap-1.5 p-1.5 sm:left-6 sm:right-auto sm:top-6 sm:gap-2 sm:p-2">
                    <GlassSelect
                        frost="clear"
                        value={selectedEvent}
                        onChange={(e) => setSelectedEvent(e.target.value)}
                        className="h-9 min-w-0 flex-1 text-xs sm:h-[46px] sm:min-w-[190px] sm:flex-none sm:text-sm [&>select]:h-full [&>select]:py-0 [&>select]:pl-4 [&>select]:pr-8 sm:[&>select]:pl-5 sm:[&>select]:pr-10"
                    >
                        <option value="">Todos los eventos</option>
                        {eventos.map((ev) => (
                            <option key={ev.id} value={ev.ruta}>
                                {ev.nombre}
                            </option>
                        ))}
                    </GlassSelect>

                    {/* Abrir la cuadrícula (antes flotaba abajo a la derecha, junto al logo) */}
                    <GlassButton
                        onClick={() => setShowGridModal(true)}
                        aria-label="Ver en cuadrícula"
                        title="Ver en cuadrícula"
                        className="h-9 w-9 !p-0 sm:h-[46px] sm:w-[46px]"
                    >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                            <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
                            <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" />
                            <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" />
                            <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" />
                        </svg>
                    </GlassButton>

                    {/* Vista actual: abre el menú de vistas */}
                    <GlassButton
                        onClick={(e) => toggleViewMenu(e.currentTarget)}
                        aria-haspopup="menu"
                        aria-expanded={viewMenuAt !== null}
                        className="h-9 !gap-1 !px-3 !py-0 text-xs sm:h-[46px] sm:!gap-1.5 sm:!px-4 sm:text-sm"
                    >
                        {VIEW_LABELS[viewMode]}
                        <ChevronDown className={`h-3.5 w-3.5 text-white/60 transition-transform duration-200 ${viewMenuAt ? 'rotate-180' : ''}`} strokeWidth={2} />
                    </GlassButton>

                    {/* Subir foto e inicio solo con ícono, para que la barra no crezca */}
                    <GlassButton
                        onClick={() => router.push('/upload')}
                        aria-label="Subir foto"
                        title="Subir foto"
                        className="h-9 w-9 !p-0 sm:h-[46px] sm:w-[46px]"
                    >
                        <ImagePlus className="h-5 w-5" strokeWidth={1.6} />
                    </GlassButton>
                    <GlassButton
                        onClick={() => router.push('/')}
                        aria-label="Inicio"
                        title="Inicio"
                        className="h-9 w-9 !p-0 sm:h-[46px] sm:w-[46px]"
                    >
                        <House className="h-5 w-5" strokeWidth={1.6} />
                    </GlassButton>
                </Glass>

                {/* Sin filter cuando no hay transición: un filter permanente aplanaría y encarecería las vistas 3D */}
                <div
                    className="absolute inset-0 z-0"
                    style={{
                        transition: `opacity ${VIEW_EXIT_MS}ms ease, filter ${VIEW_EXIT_MS}ms ease`,
                        ...(viewLeaving ? { opacity: 0, filter: 'blur(12px)' } : {}),
                    }}
                >
                    {viewMode === 'wall' ? (
                        wallItems.length > 0 ? (
                            <DriftWall
                                items={wallItems}
                                transitionKey={selectedEvent}
                                itemsKey={loadedEvent ?? ''}
                                columns={layout.lanes.length}
                                lanes={layout.lanes}
                                orientation={composition.orientation}
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
                                paused={frozen}
                                onItemClick={(item) => item.id && urls[item.id] && handleSelect(urls[item.id].full)}
                            />
                        ) : (
                            // Mientras cargan no se muestra texto: el muro entra con su animación
                            loadedEvent === selectedEvent && (
                                <div className="h-full w-full flex items-center justify-center text-white/50 text-sm">
                                    Aún no hay fotos en este evento
                                </div>
                            )
                        )
                    ) : viewMode === 'dome' ? (
                        wallItems.length > 0 && (
                            <DomeGallery
                                items={wallItems}
                                itemsKey={loadedEvent ?? ''}
                                paused={frozen}
                                shuffle={domeShuffle}
                                onItemClick={(item) => item.id && urls[item.id] && handleSelect(urls[item.id].full)}
                            />
                        )
                    ) : (
                        <GalleryCanvas images={images} urls={urls} onSelect={handleSelect} eventId={loadedEvent ?? ''} paused={frozen} />
                    )}
                </div>

                {/* Menú de vistas. Va fuera de la barra (su vidrio recorta lo que sobresale) y se coloca bajo
                    el botón; Globo abre a un lado su submenú Fijo / Vivo. Tocar fuera lo cierra. */}
                {viewMenuAt && (
                    <>
                        <div className="fixed inset-0 z-20" onClick={() => setViewMenuAt(null)} />
                        <div className="fixed z-20 flex items-start gap-2" style={{ left: viewMenuAt.left, top: viewMenuAt.top }}>
                            <Glass radius={22} frost="clear" refraction={0} className="w-32 p-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div role="menu" aria-label="Vista" className="flex flex-col gap-0.5">
                                    {(['wall', 'dome', 'flight'] as const).map(mode => (
                                        <GlassButton
                                            key={mode}
                                            role="menuitemradio"
                                            aria-checked={viewMode === mode}
                                            size="sm"
                                            selected={viewMode === mode}
                                            onClick={() => changeViewMode(mode)}
                                            onPointerEnter={(e) => { if (e.pointerType === 'mouse') setDomeSubmenu(mode === 'dome') }}
                                            className={`!justify-between text-xs sm:text-sm ${viewMode === mode ? '' : '!bg-transparent !shadow-none !outline-transparent text-white/70'}`}
                                        >
                                            {VIEW_LABELS[mode]}
                                            {mode === 'dome' && <ChevronRight className="h-3.5 w-3.5 text-white/60" strokeWidth={2} />}
                                        </GlassButton>
                                    ))}
                                </div>
                            </Glass>

                            {/* Submenú del globo, alineado con su fila (segunda del menú) */}
                            {domeSubmenu && (
                                <Glass radius={22} frost="clear" refraction={0} className="mt-[34px] w-28 p-1 sm:mt-[38px] animate-in fade-in slide-in-from-left-2 duration-200">
                                    <div role="menu" aria-label="Fotos del globo" className="flex flex-col gap-0.5">
                                        {([[false, 'Fijo'], [true, 'Vivo']] as const).map(([value, label]) => (
                                            <GlassButton
                                                key={label}
                                                role="menuitemradio"
                                                aria-checked={viewMode === 'dome' && domeShuffle === value}
                                                size="sm"
                                                selected={viewMode === 'dome' && domeShuffle === value}
                                                onClick={() => {
                                                    if (viewMode !== 'dome') changeViewMode('dome')
                                                    changeDomeShuffle(value)
                                                }}
                                                className={`!justify-start text-xs sm:text-sm ${viewMode === 'dome' && domeShuffle === value ? '' : '!bg-transparent !shadow-none !outline-transparent text-white/70'}`}
                                            >
                                                {label}
                                            </GlassButton>
                                        ))}
                                    </div>
                                </Glass>
                            )}
                        </div>
                    </>
                )}

                {selectedImage && (
                    <FullscreenViewer hash={selectedImage} onClose={handleCloseViewer} />
                )}


                {logoUrl && <img
                    src={logoUrl}
                    alt="Galería"
                    className={`absolute bottom-5 right-5 z-10 h-auto w-[min(120px,20vw)] pointer-events-none transition-[opacity,filter,transform] duration-500 ease-in-out drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)] ${isLogoTransitioning ? 'opacity-0 blur-md scale-95' : 'opacity-80 blur-0 scale-100'}`}
                />}
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