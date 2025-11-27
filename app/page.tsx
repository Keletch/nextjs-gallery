'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ColorBends from '@/components/ColorBends'
import Noise from '@/components/Noise'

function generateRandomColors(): string[] {
    const numColors = 3 + Math.floor(Math.random() * 2)
    const colors: string[] = []

    for (let i = 0; i < numColors; i++) {
        const hue = Math.floor(Math.random() * 360)
        const saturation = 60 + Math.floor(Math.random() * 40)
        const lightness = 45 + Math.floor(Math.random() * 35)

        const h = hue / 360
        const s = saturation / 100
        const l = lightness / 100

        let r, g, b
        if (s === 0) {
            r = g = b = l
        } else {
            const hue2rgb = (p: number, q: number, t: number) => {
                if (t < 0) t += 1
                if (t > 1) t -= 1
                if (t < 1 / 6) return p + (q - p) * 6 * t
                if (t < 1 / 2) return q
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
                return p
            }
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s
            const p = 2 * l - q
            r = hue2rgb(p, q, h + 1 / 3)
            g = hue2rgb(p, q, h)
            b = hue2rgb(p, q, h - 1 / 3)
        }

        const toHex = (x: number) => {
            const hex = Math.round(x * 255).toString(16)
            return hex.length === 1 ? '0' + hex : hex
        }

        colors.push(`#${toHex(r)}${toHex(g)}${toHex(b)}`)
    }

    return colors
}

function generateColorBendsParams() {
    return {
        colors: generateRandomColors(),
        rotation: Math.random() * 360,
        speed: 0.2 + Math.random() * 0.5,
        scale: Math.random() * 2,
        frequency: 1 + Math.random() * 2,
        warpStrength: 1,
        mouseInfluence: 1.2,
        parallax: Math.random(),
        noise: 0, // Noise handled by separate overlay component
    }
}

export default function Home() {
    const [colorBendsParams, setColorBendsParams] = useState<ReturnType<typeof generateColorBendsParams> | null>(null)
    const [mounted, setMounted] = useState(false)
    const [showContent, setShowContent] = useState(false)

    useEffect(() => {
        setColorBendsParams(generateColorBendsParams())
        setMounted(true)

        const timer = setTimeout(() => {
            setShowContent(true)
        }, 300)

        return () => {
            clearTimeout(timer)
        }
    }, [])

    if (!mounted || !colorBendsParams) {
        return <main className="relative min-h-screen w-full overflow-hidden bg-black" />
    }

    return (
        <main className="relative min-h-screen w-full overflow-y-auto overflow-x-hidden bg-black scrollbar-hide">
            <div className="absolute inset-0 z-0" style={{ width: '100%', height: '100%' }}>
                <ColorBends {...colorBendsParams} transparent />
                <Noise patternSize={250} patternScaleX={1} patternScaleY={1} patternAlpha={15} />
            </div>

            <div className={`relative z-50 flex min-h-screen items-center justify-center p-2 sm:p-4 md:p-6 transition-all duration-1000 ease-out ${showContent ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-110 blur-sm'}`}>
                <div className="w-full max-w-7xl h-full flex flex-col justify-center gap-3 py-8 sm:gap-6 sm:py-10 md:gap-8 md:py-12 lg:gap-10 lg:py-16">

                    <div className="text-center space-y-2 sm:space-y-4 md:space-y-6 animate-[slideDown_0.8s_ease-out]">
                        <div className="inline-block">
                            <h1 className="font-mono text-5xl font-black tracking-tight text-[#00ffa3] sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
                                Galería CDI
                            </h1>
                        </div>

                        <p className="font-mono text-base font-semibold text-white drop-shadow-lg sm:text-xl md:text-2xl lg:text-3xl">
                            Comparte, Descubre y Revive tus momentos
                        </p>

                        <div className="flex flex-wrap justify-center gap-2 text-xs font-mono text-white/80 sm:gap-3 sm:text-sm">
                            <span className="rounded-full bg-gray-800/40 px-3 py-1 backdrop-blur-md sm:px-4 sm:py-2">Eventos</span>
                            <span className="rounded-full bg-gray-800/40 px-3 py-1 backdrop-blur-md sm:px-4 sm:py-2">Fotografía</span>
                            <span className="rounded-full bg-gray-800/40 px-3 py-1 backdrop-blur-md sm:px-4 sm:py-2">Comunidad</span>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 md:gap-6">
                        <Link href="/gallery" className="group relative overflow-hidden rounded-2xl border-2 border-pink-500/30 bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-blue-500/20 p-5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-500 hover:scale-[1.03] hover:border-pink-500/50 hover:shadow-[0_8px_60px_rgba(255,100,255,0.4)] sm:rounded-3xl sm:p-6 md:p-8 lg:p-10">
                            <div className="absolute inset-0 bg-gradient-to-br from-pink-600/0 via-purple-600/0 to-blue-600/0 opacity-0 transition-all duration-500 group-hover:from-pink-600/30 group-hover:via-purple-600/30 group-hover:to-blue-600/30 group-hover:opacity-100" />
                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />

                            <div className="relative space-y-1 sm:space-y-2 md:space-y-3">
                                <div className="font-mono text-xl font-black text-white sm:text-2xl md:text-3xl lg:text-4xl">Ver Galería</div>
                                <p className="font-mono text-xs text-white/80 sm:text-sm md:text-base">Explora todas las fotografías de nuestros eventos</p>
                            </div>

                            <div className="absolute bottom-4 right-4 text-2xl text-white/60 transition-all duration-300 group-hover:translate-x-2 group-hover:text-white sm:bottom-6 sm:right-6 sm:text-3xl md:bottom-8 md:right-8 md:text-4xl">→</div>
                        </Link>

                        <Link href="/upload" className="group relative overflow-hidden rounded-2xl border-2 border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 via-green-500/20 to-yellow-500/20 p-5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-500 hover:scale-[1.03] hover:border-cyan-500/50 hover:shadow-[0_8px_60px_rgba(100,255,255,0.4)] sm:rounded-3xl sm:p-6 md:p-8 lg:p-10">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/0 via-green-600/0 to-yellow-600/0 opacity-0 transition-all duration-500 group-hover:from-cyan-600/30 group-hover:via-green-600/30 group-hover:to-yellow-600/30 group-hover:opacity-100" />
                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />

                            <div className="relative space-y-1 sm:space-y-2 md:space-y-3">
                                <div className="font-mono text-xl font-black text-white sm:text-2xl md:text-3xl lg:text-4xl">Subir Foto</div>
                                <p className="font-mono text-xs text-white/80 sm:text-sm md:text-base">Comparte tus momentos favoritos con la comunidad</p>
                            </div>

                            <div className="absolute bottom-4 right-4 text-2xl text-white/60 transition-all duration-300 group-hover:-translate-y-2 group-hover:text-white sm:bottom-6 sm:right-6 sm:text-3xl md:bottom-8 md:right-8 md:text-4xl">↑</div>
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 md:gap-4 lg:gap-5">
                        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-pink-500/15 via-red-500/15 to-orange-500/15 p-3 backdrop-blur-lg shadow-lg transition-all duration-500 hover:scale-[1.02] sm:hover:scale-105 hover:shadow-[0_0_40px_rgba(255,100,150,0.3)] sm:rounded-2xl sm:p-4 md:p-5 lg:p-6">
                            <div className="absolute inset-0 bg-gradient-to-br from-pink-600/0 to-orange-600/0 opacity-0 transition-opacity duration-500 group-hover:from-pink-600/20 group-hover:to-orange-600/20 group-hover:opacity-100" />
                            <div className="relative">
                                <div className="mb-2 text-3xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-4 sm:text-4xl md:mb-3 md:text-5xl">📸</div>
                                <h3 className="mb-1 font-mono text-sm font-bold text-white sm:text-base md:text-lg lg:text-xl">Captura Momentos</h3>
                                <p className="font-mono text-xs text-white/80 leading-relaxed sm:text-sm">Sube y comparte tus mejores fotografías de cada evento</p>
                            </div>
                        </div>

                        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/15 via-blue-500/15 to-indigo-500/15 p-3 backdrop-blur-lg shadow-lg transition-all duration-500 hover:scale-[1.02] sm:hover:scale-105 hover:shadow-[0_0_40px_rgba(150,100,255,0.3)] sm:rounded-2xl sm:p-4 md:p-5 lg:p-6">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/0 to-indigo-600/0 opacity-0 transition-opacity duration-500 group-hover:from-purple-600/20 group-hover:to-indigo-600/20 group-hover:opacity-100" />
                            <div className="relative">
                                <div className="mb-2 text-3xl transition-all duration-500 group-hover:scale-110 group-hover:-rotate-4 sm:text-4xl md:mb-3 md:text-5xl">🎯</div>
                                <h3 className="mb-1 font-mono text-sm font-bold text-white sm:text-base md:text-lg lg:text-xl">Organiza y Filtra</h3>
                                <p className="font-mono text-xs text-white/80 leading-relaxed sm:text-sm">Encuentra rápidamente fotos por evento</p>
                            </div>
                        </div>

                        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500/15 via-teal-500/15 to-green-500/15 p-3 backdrop-blur-lg shadow-lg transition-all duration-500 col-span-2 sm:col-span-2 md:col-span-1 hover:scale-100 sm:hover:scale-105 hover:shadow-[0_0_40px_rgba(100,255,200,0.3)] sm:rounded-2xl sm:p-4 md:p-5 lg:p-6">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/0 to-green-600/0 opacity-0 transition-opacity duration-500 group-hover:from-cyan-600/20 group-hover:to-green-600/20 group-hover:opacity-100" />
                            <div className="relative">
                                <div className="mb-2 text-3xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-4 sm:text-4xl md:mb-3 md:text-5xl">✨</div>
                                <h3 className="mb-1 font-mono text-sm font-bold text-white sm:text-base md:text-lg lg:text-xl">Acumula Experiencias</h3>
                                <p className="font-mono text-xs text-white/80 leading-relaxed sm:text-sm">Revive los mejores momentos con la comunidad</p>
                            </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="font-mono text-xs text-white/60 sm:text-sm">Hecho con ❤️ | @somoscdi @hyenukchu</p>
                    </div>
                </div>
            </div>


        </main>
    )
}
