'use client'
import { Canvas, useThree } from '@react-three/fiber'
import { useState, useEffect, useRef, useCallback } from 'react'
import { ImageBitmapLoader, SRGBColorSpace, Texture } from 'three'
import FloatingImage from './FloatingImage'

interface GalleryCanvasProps {
    images: string[]
    urls: Record<string, { thumb: string; full: string }>
    onSelect: (url: string) => void
    eventId: string
}

// Máximo de imágenes flotando a la vez
const MAX_ACTIVE = 18
// Cuántas texturas se mantienen listas (decodificadas y en GPU) por adelantado
const PRELOAD_AHEAD = 3

function shuffle<T>(arr: T[]): T[] {
    const out = [...arr]
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]]
    }
    return out
}

// ImageBitmapLoader decodifica fuera del hilo principal (TextureLoader lo hace al subir a GPU y congela el frame)
const bitmapLoader = new ImageBitmapLoader()
bitmapLoader.setOptions({ imageOrientation: 'flipY' })
bitmapLoader.setCrossOrigin('anonymous')

interface ActiveImage {
    filename: string
    texture: Texture
}

function disposeTexture(texture: Texture) {
    texture.dispose()
    const image = texture.image as ImageBitmap | undefined
    image?.close?.()
}

function GalleryScene({ images, urls, onSelect }: Omit<GalleryCanvasProps, 'eventId'>) {
    const gl = useThree((state) => state.gl)

    // Solo se montan las imágenes activas. El resto espera en un "mazo" barajado;
    // cuando se vacía se vuelve a barajar (sin las que ya están en uso), así el orden
    // es aleatorio y no se repiten hasta haber pasado todas.
    // Una imagen solo entra a escena cuando su textura ya está decodificada y en GPU.
    const [active, setActive] = useState<ActiveImage[]>([])
    const activeRef = useRef<ActiveImage[]>([])
    // Las funciones de abajo se llaman desde callbacks memorizados (onExit, interval):
    // leer las URLs desde una ref evita usar las de un render viejo
    const urlsRef = useRef(urls)
    const pool = useRef<string[]>([])
    const deck = useRef<string[]>([])
    // Precargadas (decodificadas y en GPU) esperando turno
    const ready = useRef<ActiveImage[]>([])
    const pending = useRef<Set<string>>(new Set())
    const toDispose = useRef<Texture[]>([])
    const generation = useRef(0)

    const commitActive = (next: ActiveImage[]) => {
        activeRef.current = next
        setActive(next)
    }

    const drawFromDeck = (): string | undefined => {
        if (deck.current.length === 0) {
            const inUse = new Set([
                ...activeRef.current.map(a => a.filename),
                ...ready.current.map(r => r.filename),
                ...pending.current,
            ])
            deck.current = shuffle(pool.current.filter(f => !inUse.has(f)))
        }
        return deck.current.pop()
    }

    const prefetch = () => {
        while (ready.current.length + pending.current.size < PRELOAD_AHEAD) {
            const filename = drawFromDeck()
            if (!filename) return
            const thumb = urlsRef.current[filename]?.thumb
            if (!thumb) continue

            const gen = generation.current
            pending.current.add(filename)

            bitmapLoader.loadAsync(thumb)
                .then((bitmap) => {
                    const texture = new Texture(bitmap as ImageBitmap)
                    texture.flipY = false // ya viene volteada por imageOrientation
                    texture.colorSpace = SRGBColorSpace
                    texture.needsUpdate = true

                    // Evento cambiado mientras cargaba: descartar
                    if (gen !== generation.current) {
                        disposeTexture(texture)
                        return
                    }

                    gl.initTexture(texture) // subir a GPU ahora, no en el frame en que aparece
                    pending.current.delete(filename)
                    ready.current.push({ filename, texture })
                })
                .catch((err) => {
                    if (gen !== generation.current) return
                    console.warn('[gallery] No se pudo cargar miniatura:', filename, err)
                    pending.current.delete(filename)
                    prefetch()
                })
        }
    }

    const takeNext = (): ActiveImage | undefined => {
        const next = ready.current.shift()
        prefetch()
        return next
    }

    // Liberar texturas solo después de que React quitó sus mallas de la escena
    useEffect(() => {
        for (const texture of toDispose.current) disposeTexture(texture)
        toDispose.current = []
    }, [active])

    // Nuevo evento: reiniciar mazo y empezar de 0
    useEffect(() => {
        generation.current++
        for (const { texture } of ready.current) disposeTexture(texture)
        for (const { texture } of activeRef.current) toDispose.current.push(texture)
        ready.current = []
        pending.current.clear()

        urlsRef.current = urls
        pool.current = images.filter(f => urls[f]?.thumb)
        deck.current = shuffle(pool.current)
        // Reinicio intencional: la lista de imágenes cambió (nuevo evento)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        commitActive([])
        prefetch()

        // Agregar una imagen por segundo hasta llenar
        const interval = setInterval(() => {
            if (document.hidden || activeRef.current.length >= MAX_ACTIVE) return
            const next = takeNext()
            if (next) commitActive([...activeRef.current, next])
        }, 1000)

        return () => clearInterval(interval)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [images, urls])

    // Al desmontar la galería, liberar todo
    useEffect(() => {
        const gen = generation
        const readyList = ready
        const activeList = activeRef
        return () => {
            gen.current++ // descarta cargas en curso
            for (const { texture } of [...readyList.current, ...activeList.current]) disposeTexture(texture)
            readyList.current = []
        }
    }, [])

    const handleImageExit = useCallback((filename: string) => {
        const leaving = activeRef.current.find(a => a.filename === filename)
        if (leaving) toDispose.current.push(leaving.texture)

        activeRef.current = activeRef.current.filter(a => a.filename !== filename)
        const next = takeNext()
        commitActive(next ? [...activeRef.current, next] : activeRef.current)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <>
            <ambientLight intensity={0.2} />
            <hemisphereLight intensity={0.5} groundColor={'#222'} />
            <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow color={'#ffddaa'} />
            {active.map(({ filename, texture }) => {
                const entry = urls[filename]
                if (!entry) return null

                return (
                    <FloatingImage
                        key={filename}
                        texture={texture}
                        delay={0}
                        onClick={() => onSelect(entry.full)}
                        onExit={() => handleImageExit(filename)}
                    />
                )
            })}
        </>
    )
}

export default function GalleryCanvas({ images, urls, onSelect }: GalleryCanvasProps) {
    return (
        <Canvas
            camera={{ position: [0, 0, 5], fov: 60 }}
            shadows
            frameloop="always"
            gl={{ powerPreference: 'high-performance' }}
        >
            <GalleryScene images={images} urls={urls} onSelect={onSelect} />
        </Canvas>
    )
}
