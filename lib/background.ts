// Parámetros aleatorios del fondo animado (GhostFibers), compartidos por todas las páginas.
// Se generan una vez por visita para que el fondo no se vea siempre igual.

// Verde del logo del Club: color de las fibras cuando no hay evento seleccionado
export const BRAND_GREEN = '#08e888'

export function randomFiberParams({ interactive = true }: { interactive?: boolean } = {}) {
    return {
        rotation: Math.random() * 360,
        speed: 0.2 + Math.random() * 0.5,
        scale: 0.8 + Math.random() * 0.6,
        twist: 0.8 + Math.random() * 1.2,
        waves: 0.6 + Math.random() * 0.8,
        perspective: 0.4 + Math.random() * 0.5,
        mouseInteraction: interactive,
    }
}

// Colores aleatorios en HSL (saturados y de luminosidad media para que brillen sobre negro)
export function randomColors(count = 2): string[] {
    const colors: string[] = []

    for (let i = 0; i < count; i++) {
        const h = Math.floor(Math.random() * 360) / 360
        const s = (60 + Math.floor(Math.random() * 40)) / 100
        const l = (45 + Math.floor(Math.random() * 35)) / 100

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
        const rgb = [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)]

        colors.push('#' + rgb.map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join(''))
    }

    return colors
}
