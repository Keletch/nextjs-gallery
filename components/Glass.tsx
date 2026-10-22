'use client'

// Vidrio estilo iOS: refracción real de lo que hay detrás (filtro SVG de desplazamiento
// aplicado con backdrop-filter), leve dispersión cromática en los bordes, brillo especular
// y aro de luz. Sin tintes de color: solo vidrio neutro.
//
// Chrome/Edge soportan filtros SVG en backdrop-filter. Safari y Firefox no: ahí se usa
// el mismo vidrio con desenfoque (fallback).

import React, { useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'

type Frost = 'clear' | 'regular' | 'heavy'

// Desenfoque de lo que hay detrás según el uso: botones casi transparentes, paneles con texto más esmerilados
const FROST_BLUR: Record<Frost, number> = { clear: 3, regular: 10, heavy: 22 }
const FALLBACK_BLUR: Record<Frost, number> = { clear: 12, regular: 20, heavy: 30 }

// Tinte neutro oscuro según el uso (como los "materiales" de iOS): sobre fotos claras
// el texto blanco necesita que el vidrio atenúe lo de atrás, si no se pierde el contraste
const TINT: Record<Frost, string> = {
    clear: 'bg-black/[0.16]',
    regular: 'bg-black/[0.26]',
    heavy: 'bg-black/[0.44]',
}
// Atenuación del fondo dentro del filtro (complementa el tinte)
const BACKDROP_BRIGHTNESS: Record<Frost, number> = { clear: 0.96, regular: 0.9, heavy: 0.8 }

const SPECULAR =
    'inset 0 1px 0.5px rgba(255,255,255,0.45), inset 0 -1px 0.5px rgba(255,255,255,0.10), ' +
    'inset 1px 0 0.5px rgba(255,255,255,0.10), inset -1px 0 0.5px rgba(255,255,255,0.10), ' +
    'inset 0 0 0 0.5px rgba(255,255,255,0.16), 0 12px 32px -12px rgba(0,0,0,0.55)'

let svgBackdropSupported: boolean | null = null

function supportsSvgBackdrop(): boolean {
    if (svgBackdropSupported !== null) return svgBackdropSupported
    const ua = navigator.userAgent
    const safariOnly = /Safari/.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)
    const firefox = /Firefox/.test(ua)
    svgBackdropSupported = !safariOnly && !firefox && CSS.supports('backdrop-filter', 'url(#glass)')
    return svgBackdropSupported
}

const noopSubscribe = () => () => { }

// Área máxima (px²) con refracción SVG. El filtro SVG en backdrop-filter lo calcula el CPU: en un botón
// es barato, pero en un panel grande (p. ej. un modal de 1700×930) bajaba la galería a ~5 fps.
// Por encima de esto se usa solo el desenfoque (GPU), que en superficies grandes se ve casi igual.
const MAX_REFRACTION_AREA = 250_000

// Mapa de desplazamiento: gris 50% en el centro (sin desvío) y gradientes en el borde.
// R desvía en X y B en Y; ambos apuntan hacia adentro, como el canto de una lente.
function displacementMap(width: number, height: number, radius: number) {
    const edge = Math.max(6, Math.min(28, Math.min(width, height) * 0.2))
    const innerRadius = Math.max(radius - edge * 0.6, 0)
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
        `<defs>` +
        `<linearGradient id="x" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f00"/><stop offset="1" stop-color="#000"/></linearGradient>` +
        `<linearGradient id="y" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00f"/><stop offset="1" stop-color="#000"/></linearGradient>` +
        `</defs>` +
        `<rect width="${width}" height="${height}" fill="#000"/>` +
        `<rect width="${width}" height="${height}" rx="${radius}" fill="url(#x)"/>` +
        `<rect width="${width}" height="${height}" rx="${radius}" fill="url(#y)" style="mix-blend-mode:screen"/>` +
        `<rect x="${edge}" y="${edge}" width="${Math.max(width - edge * 2, 0)}" height="${Math.max(height - edge * 2, 0)}" ` +
        `rx="${innerRadius}" fill="#808080" style="filter:blur(${edge * 0.55}px)"/>` +
        `</svg>`
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

type GlassOwnProps = {
    as?: React.ElementType
    /** Radio de las esquinas en px (también define la forma de la refracción) */
    radius?: number
    frost?: Frost
    /** Fuerza de la refracción en los bordes. 0 = sin filtro SVG (para elementos repetidos en listas largas) */
    refraction?: number
    /** Estado activo/seleccionado: vidrio un poco más iluminado */
    selected?: boolean
    className?: string
    style?: React.CSSProperties
    children?: React.ReactNode
}

export type GlassProps = GlassOwnProps & Omit<React.AllHTMLAttributes<HTMLElement>, keyof GlassOwnProps | 'as'>

// Tipo concreto para el elemento dinámico (`as`): evita que TypeScript colapse las props a `never`
type GlassElement = React.ComponentType<
    React.AllHTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> }
>

export default function Glass({
    as = 'div',
    radius = 24,
    frost = 'regular',
    refraction = 42,
    selected = false,
    className,
    style,
    children,
    ...rest
}: GlassProps) {
    const Component = as as GlassElement
    const ref = useRef<HTMLElement>(null)
    const filterId = `glass-${useId().replace(/:/g, '')}`
    const [size, setSize] = useState({ width: 0, height: 0 })
    const svgSupported = useSyncExternalStore(noopSubscribe, supportsSvgBackdrop, () => false)

    useLayoutEffect(() => {
        const el = ref.current
        if (!el) return
        const measure = () => {
            const width = Math.round(el.offsetWidth)
            const height = Math.round(el.offsetHeight)
            setSize(prev => (prev.width === width && prev.height === height ? prev : { width, height }))
        }
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const effectiveRadius = Math.min(radius, size.height / 2 || radius)
    const map = useMemo(
        () => (size.width > 0 && size.height > 0 ? displacementMap(size.width, size.height, effectiveRadius) : null),
        [size.width, size.height, effectiveRadius]
    )
    const refracting = svgSupported && map !== null && refraction > 0 && size.width * size.height <= MAX_REFRACTION_AREA

    const backdrop = refracting
        ? `url(#${filterId}) blur(${FROST_BLUR[frost]}px) saturate(1.15) brightness(${BACKDROP_BRIGHTNESS[frost]})`
        : `blur(${FALLBACK_BLUR[frost]}px) saturate(1.4) brightness(${BACKDROP_BRIGHTNESS[frost]})`

    // Dispersión: cada canal se desvía un poco distinto
    const scales = [refraction, refraction * 0.94, refraction * 0.88]

    return (
        <Component
            ref={ref}
            className={cn(
                'relative isolate overflow-hidden text-white',
                selected ? 'bg-white/[0.2]' : TINT[frost],
                frost !== 'clear' && '[text-shadow:0_1px_2px_rgba(0,0,0,0.25)]',
                className
            )}
            style={{
                borderRadius: radius,
                backdropFilter: backdrop,
                WebkitBackdropFilter: backdrop,
                boxShadow: selected
                    ? SPECULAR.replace('0.45)', '0.7)').replace('0.16)', '0.32)')
                    : SPECULAR,
                ...style,
            }}
            {...rest}
        >
            {refracting && (
                <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
                    <filter id={filterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
                        <feImage href={map} x="0" y="0" width={size.width} height={size.height} preserveAspectRatio="none" result="map" />
                        {(['R', 'G', 'B'] as const).map((channel, i) => (
                            <React.Fragment key={channel}>
                                <feDisplacementMap
                                    in="SourceGraphic"
                                    in2="map"
                                    scale={scales[i]}
                                    xChannelSelector="R"
                                    yChannelSelector="B"
                                    result={`d${channel}`}
                                />
                                <feColorMatrix
                                    in={`d${channel}`}
                                    type="matrix"
                                    values={
                                        channel === 'R'
                                            ? '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'
                                            : channel === 'G'
                                                ? '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'
                                                : '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0'
                                    }
                                    result={channel}
                                />
                            </React.Fragment>
                        ))}
                        <feBlend in="R" in2="G" mode="screen" result="RG" />
                        <feBlend in="RG" in2="B" mode="screen" />
                    </filter>
                </svg>
            )}
            {/* Brillo especular: luz que entra por arriba y rebota abajo */}
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10"
                style={{
                    borderRadius: 'inherit',
                    background:
                        'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.03) 38%, rgba(255,255,255,0) 62%, rgba(255,255,255,0.06) 100%)',
                }}
            />
            {children}
        </Component>
    )
}

type ButtonProps = Omit<GlassProps, 'size'> & {
    size?: 'sm' | 'md' | 'lg'
}

const BUTTON_SIZES = {
    sm: 'px-3.5 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
}

// Botón de vidrio (también sirve para links: as={Link})
export function GlassButton({ as = 'button', size = 'md', radius = 14, className, ...rest }: ButtonProps) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { frost, ...props } = rest
    return (
        <Glass
            as={as}
            radius={radius}
            frost="clear"
            refraction={30}
            className={cn(
                'inline-flex items-center justify-center gap-2 font-medium tracking-tight cursor-pointer select-none',
                'transition-[transform,background-color] duration-200 ease-out',
                'hover:bg-white/[0.11] active:scale-[0.97]',
                'disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60',
                BUTTON_SIZES[size],
                className
            )}
            {...props}
        />
    )
}

// Campos de formulario: el vidrio es el contenedor y el control nativo va transparente encima
const FIELD = 'w-full bg-transparent px-4 py-3 text-white placeholder:text-white/40 outline-none disabled:opacity-50'

export function GlassInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <Glass radius={14} frost="regular" refraction={24} className={cn('focus-within:bg-black/[0.36] transition-colors', className)}>
            <input {...props} className={FIELD} />
        </Glass>
    )
}

export function GlassTextarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <Glass radius={16} frost="regular" refraction={24} className={cn('focus-within:bg-black/[0.36] transition-colors', className)}>
            <textarea {...props} className={cn(FIELD, 'resize-none')} />
        </Glass>
    )
}

export function GlassSelect({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <Glass radius={14} frost="regular" refraction={24} className={cn('focus-within:bg-black/[0.36] transition-colors', className)}>
            <select {...props} className={cn(FIELD, 'cursor-pointer appearance-none pr-10 [&>option]:bg-neutral-900')}>
                {children}
            </select>
            <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
            >
                <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </Glass>
    )
}
