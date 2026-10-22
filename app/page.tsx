'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowUp } from 'lucide-react'
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

export default function Home() {
    const [fiberParams, setFiberParams] = useState<ReturnType<typeof generateFiberParams> | null>(null)
    const [trail, setTrail] = useState<string[]>([])
    const [stats, setStats] = useState<{ fotos: number; eventos: number } | null>(null)
    const [showContent, setShowContent] = useState(false)

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

                    <header className="space-y-4 text-center">
                        <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl md:text-7xl">
                            Galería CDI
                        </h1>
                        <p className="text-lg text-white/75 sm:text-xl">
                            Las fotos de los eventos del Club de Inversionistas
                        </p>
                        <p className={`text-sm text-white/55 transition-opacity duration-700 ${stats ? 'opacity-100' : 'opacity-0'}`}>
                            {stats ? `${stats.fotos.toLocaleString('es-MX')} fotos de ${stats.eventos} eventos` : ' '}
                        </p>
                    </header>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Glass
                            as={Link}
                            href="/gallery"
                            radius={30}
                            frost="regular"
                            className="group block p-7 transition-[transform,background-color] duration-300 hover:bg-white/[0.09] active:scale-[0.99] sm:p-8"
                        >
                            <div className="flex items-start justify-between gap-6">
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-semibold tracking-tight">Ver galería</h2>
                                    <p className="text-sm text-white/65">Explora las fotos de cada evento</p>
                                </div>
                                <ArrowRight className="mt-1 h-6 w-6 shrink-0 text-white/60 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" strokeWidth={1.6} />
                            </div>
                        </Glass>

                        <Glass
                            as={Link}
                            href="/upload"
                            radius={30}
                            frost="regular"
                            className="group block p-7 transition-[transform,background-color] duration-300 hover:bg-white/[0.09] active:scale-[0.99] sm:p-8"
                        >
                            <div className="flex items-start justify-between gap-6">
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-semibold tracking-tight">Subir foto</h2>
                                    <p className="text-sm text-white/65">Comparte tus momentos con la comunidad</p>
                                </div>
                                <ArrowUp className="mt-1 h-6 w-6 shrink-0 text-white/60 transition-transform duration-300 group-hover:-translate-y-1 group-hover:text-white" strokeWidth={1.6} />
                            </div>
                        </Glass>
                    </div>

                    <p className="text-center text-xs text-white/45 sm:text-sm">
                        Hecho con cariño · @somoscdi · @hyenukchu
                    </p>
                </div>
            </div>
        </main>
    )
}
