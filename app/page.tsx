'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowUp, Camera, Layers, Sparkles } from 'lucide-react'
import GhostFibers from '@/components/GhostFibers'
import Glass from '@/components/Glass'
import { randomColors, randomFiberParams } from '@/lib/background'
import Noise from '@/components/Noise'

// Fondo: parámetros y colores aleatorios en cada visita
function generateFiberParams() {
    const [glowColor, secondaryColor] = randomColors(2)
    return { ...randomFiberParams({ interactive: true }), glowColor, secondaryColor }
}

const FEATURES = [
    { icon: Camera, title: 'Captura momentos', text: 'Sube y comparte tus mejores fotografías de cada evento' },
    { icon: Layers, title: 'Organiza y filtra', text: 'Encuentra rápidamente fotos por evento' },
    { icon: Sparkles, title: 'Acumula experiencias', text: 'Revive los mejores momentos con la comunidad' },
]

export default function Home() {
    const [fiberParams, setFiberParams] = useState<ReturnType<typeof generateFiberParams> | null>(null)
    const [mounted, setMounted] = useState(false)
    const [showContent, setShowContent] = useState(false)

    useEffect(() => {
        setFiberParams(generateFiberParams())
        setMounted(true)

        const timer = setTimeout(() => {
            setShowContent(true)
        }, 300)

        return () => {
            clearTimeout(timer)
        }
    }, [])

    if (!mounted || !fiberParams) {
        return <main className="relative min-h-screen w-full overflow-hidden bg-black" />
    }

    return (
        <main className="relative min-h-screen w-full overflow-y-auto overflow-x-hidden bg-black scrollbar-hide">
            <div className="absolute inset-0 z-0" style={{ width: '100%', height: '100%' }}>
                <GhostFibers {...fiberParams} dpr={1.5} />
                <Noise patternSize={250} patternScaleX={1} patternScaleY={1} patternAlpha={15} />
            </div>

            <div className={`relative z-50 flex min-h-screen items-center justify-center px-4 transition-all duration-1000 ease-out sm:px-6 ${showContent ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-105 blur-sm'}`}>
                <div className="flex w-full max-w-5xl flex-col gap-8 py-12 sm:gap-10 sm:py-16">

                    <header className="space-y-4 text-center">
                        <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl md:text-7xl">
                            Galería CDI
                        </h1>
                        <p className="text-lg text-white/70 sm:text-xl">
                            Comparte, descubre y revive tus momentos
                        </p>
                        <div className="flex flex-wrap justify-center gap-2 pt-1">
                            {['Eventos', 'Fotografía', 'Comunidad'].map(tag => (
                                <Glass key={tag} as="span" radius={999} frost="clear" refraction={22} className="px-4 py-1.5 text-sm text-white/85">
                                    {tag}
                                </Glass>
                            ))}
                        </div>
                    </header>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Glass
                            as={Link}
                            href="/gallery"
                            radius={30}
                            frost="regular"
                            className="group block p-7 transition-[transform,background-color] duration-300 hover:bg-white/[0.09] active:scale-[0.99] sm:p-9"
                        >
                            <div className="flex items-start justify-between gap-6">
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ver galería</h2>
                                    <p className="text-sm text-white/65 sm:text-base">Explora todas las fotografías de nuestros eventos</p>
                                </div>
                                <ArrowRight className="mt-1 h-6 w-6 shrink-0 text-white/60 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" strokeWidth={1.6} />
                            </div>
                        </Glass>

                        <Glass
                            as={Link}
                            href="/upload"
                            radius={30}
                            frost="regular"
                            className="group block p-7 transition-[transform,background-color] duration-300 hover:bg-white/[0.09] active:scale-[0.99] sm:p-9"
                        >
                            <div className="flex items-start justify-between gap-6">
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Subir foto</h2>
                                    <p className="text-sm text-white/65 sm:text-base">Comparte tus momentos favoritos con la comunidad</p>
                                </div>
                                <ArrowUp className="mt-1 h-6 w-6 shrink-0 text-white/60 transition-transform duration-300 group-hover:-translate-y-1 group-hover:text-white" strokeWidth={1.6} />
                            </div>
                        </Glass>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {FEATURES.map(({ icon: Icon, title, text }) => (
                            <Glass key={title} radius={24} frost="regular" className="p-5 sm:p-6">
                                <Icon className="mb-4 h-6 w-6 text-white/80" strokeWidth={1.5} />
                                <h3 className="mb-1 text-base font-semibold tracking-tight">{title}</h3>
                                <p className="text-sm leading-relaxed text-white/60">{text}</p>
                            </Glass>
                        ))}
                    </div>

                    <p className="text-center text-xs text-white/45 sm:text-sm">
                        Hecho con cariño · @somoscdi · @hyenukchu
                    </p>
                </div>
            </div>
        </main>
    )
}
