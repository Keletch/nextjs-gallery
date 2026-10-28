'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import GhostFibers from '@/components/GhostFibers'
import Glass from '@/components/Glass'
import ImageTrail from '@/components/ImageTrail'
import { randomColors, randomFiberParams } from '@/lib/background'

const STORAGE_BASE = 'https://sinpfcbinaiasorunmpz.supabase.co/storage/v1/object/public/nextjsGallery'
// Fotos que rotan en el rastro del mouse (cada una se descarga, así que pocas bastan)
const TRAIL_PHOTOS = 24

// Fondo: parámetros y colores aleatorios en cada visita
function generateFiberParams() {
    const [glowColor, secondaryColor] = randomColors(2)
    return { ...randomFiberParams({ interactive: true }), glowColor, secondaryColor }
}

const COUNT_MS = 1600

export default function Home() {
    const [fiberParams, setFiberParams] = useState<ReturnType<typeof generateFiberParams> | null>(null)
    const [trail, setTrail] = useState<string[]>([])
    const [stats, setStats] = useState<{ fotos: number; eventos: number } | null>(null)
    const [showContent, setShowContent] = useState(false)
    // Lo que muestra el contador: arranca en 0 y sube hasta stats cuando llegan
    const [shown, setShown] = useState({ fotos: 0, eventos: 0 })

    useEffect(() => {
        if (!stats) return
        let frame = 0
        const start = performance.now()
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / COUNT_MS)
            const eased = 1 - Math.pow(1 - t, 3)
            setShown({ fotos: Math.round(stats.fotos * eased), eventos: Math.round(stats.eventos * eased) })
            if (t < 1) frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
    }, [stats])

    useEffect(() => {
        // Aleatorio solo en el cliente: generarlo en el render no coincidiría con el HTML del servidor
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFiberParams(generateFiberParams())
        const timer = setTimeout(() => setShowContent(true), 300)
        // El rastro se activa con el primer movimiento real del mouse (o touchpad). No se usa
        // matchMedia('(pointer: fine)'): en laptops con pantalla táctil puede decir que no hay mouse.
        // En celular nunca llega un movimiento de mouse, así que ni se descargan esas fotos.
        let photos: string[] | null = null
        let mouseSeen = false
        const onPointerMove = (e: PointerEvent) => {
            if (e.pointerType !== 'mouse') return
            mouseSeen = true
            window.removeEventListener('pointermove', onPointerMove)
            if (photos) setTrail(photos)
        }
        window.addEventListener('pointermove', onPointerMove)

        fetch('/api/gallery-index')
            .then(res => res.json())
            .then((list: { filename: string; folder: string }[]) => {
                if (!Array.isArray(list)) return
                setStats({ fotos: list.length, eventos: new Set(list.map(f => f.folder.split('/')[0])).size })
                photos = list
                    .map(f => [Math.random(), f] as const)
                    .sort((a, b) => a[0] - b[0])
                    .slice(0, TRAIL_PHOTOS)
                    .map(([, { filename, folder }]) => `${STORAGE_BASE}/${folder.replace('/approved', '/thumbnails')}/thumb_${filename}`)
                if (mouseSeen) setTrail(photos)
            })
            .catch(() => { /* sin fotos: solo el fondo */ })

        return () => {
            clearTimeout(timer)
            window.removeEventListener('pointermove', onPointerMove)
        }
    }, [])

    return (
        <main className="relative min-h-screen w-full overflow-hidden bg-black">
            <div className="absolute inset-0 z-0">
                {fiberParams && <GhostFibers {...fiberParams} />}
            </div>
            {/* Detrás del contenido: escucha el mouse en la ventana, así no bloquea los botones */}
            <div className="absolute inset-0 z-10">
                <ImageTrail items={trail} size={190} threshold={80} lifetime={0.4} exitScale={0.2} radius={15} />
            </div>

            <div className={`relative z-20 flex min-h-screen items-center justify-center px-4 transition-all duration-1000 ease-out sm:px-6 ${showContent ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-105 blur-sm'}`}>
                <div className="flex w-full max-w-3xl flex-col gap-8 py-12 sm:gap-10 sm:py-16">

                    <header className="space-y-3 text-center">
                        {/* Raleway (letra del sitio) en su peso delgado */}
                        <h1 className="text-7xl font-light leading-none tracking-[-0.02em] text-white sm:text-8xl md:text-9xl">
                            Galería
                        </h1>
                        {/* El logo de arriba ya dice "Club de Inversionistas": aquí no se repite */}
                        <p className="text-xs uppercase tracking-[0.35em] text-white/60 sm:text-sm">
                            Colección oficial de eventos
                        </p>
                        <p className="text-sm text-white/55 tabular-nums">
                            {`${shown.fotos.toLocaleString('es-MX')} fotos de ${shown.eventos} eventos`}
                        </p>
                    </header>

                    {/* Botones chicos con vidrio que refracta de verdad: por su tamaño el filtro es barato */}
                    <div className="flex justify-center gap-3">
                        <Glass
                            as={Link}
                            href="/gallery"
                            radius={999}
                            frost="clear"
                            className="outline-1 outline-solid outline-white/20 -outline-offset-1 px-6 py-3 text-base font-medium transition-[transform,background-color] duration-300 hover:bg-white/[0.12] active:scale-[0.97] sm:px-7"
                        >
                            Ver galería
                        </Glass>
                        <Glass
                            as={Link}
                            href="/upload"
                            radius={999}
                            frost="clear"
                            className="outline-1 outline-solid outline-white/20 -outline-offset-1 px-6 py-3 text-base font-medium transition-[transform,background-color] duration-300 hover:bg-white/[0.12] active:scale-[0.97] sm:px-7"
                        >
                            Subir foto
                        </Glass>
                    </div>

                    {/* El club firma abajo, debajo de los botones */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/club-logo.png" alt="Club de Inversionistas" width={240} height={126} className="mx-auto h-auto w-24 opacity-90 sm:w-28" />
                </div>

                <p className="absolute inset-x-0 bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-xs text-white/45 sm:text-sm">
                    Hecho con cariño · @somoscdi · @hyenukchu
                </p>
            </div>
        </main>
    )
}
