import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css"

// Ignora los warnings de Supabase en modo dev
if (process.env.NODE_ENV === 'development') {
    const originalError = console.error
    console.error = (...args) => {
        if (typeof args[0] === 'string' && args[0].includes('Failed to parse cookie string')) return
        originalError(...args)
    }
}

// Optimización de fonts
const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
    display: 'swap',
    preload: true,
})

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
    display: 'swap',
    preload: true,
})

// Metadata completa para SEO
export const metadata: Metadata = {
    metadataBase: new URL('https://galeria.chu.mx'),
    title: {
        default: 'Galería CDI - Club de Inversionistas',
        template: '%s | Galería CDI',
    },
    description: 'Galería interactiva del Club de Inversionistas. Comparte tus experiencias, fotos de eventos y conecta con nuestra comunidad.',
    keywords: [
        'Club de Inversionistas',
        'CDI',
        'galería de fotos',
        'eventos CDI',
        'comunidad inversionistas',
        'fotos eventos',
        'galería interactiva',
    ],
    authors: [{ name: 'Keletch', url: 'https://github.com/keletch' }],
    creator: 'Keletch',
    publisher: 'Club de Inversionistas',
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    openGraph: {
        type: 'website',
        locale: 'es_MX',
        url: 'https://galeria.chu.mx',
        siteName: 'Galería CDI',
        title: 'Galería CDI - Club de Inversionistas',
        description: 'Comparte tus experiencias y fotos con nuestra comunidad',
        images: [
            {
                url: '/SHIFT.png',
                width: 1200,
                height: 630,
                alt: 'Galería CDI',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Galería CDI',
        description: 'Comparte tus experiencias con nuestra comunidad',
        images: ['/SHIFT.png'],
    },
    alternates: {
        canonical: 'https://galeria.chu.mx',
    },
}

// Export separado para viewport (requerido por Next.js 14+)
export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    themeColor: '#000000',

}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="es">
            <head>
                {/* Preconnect a Supabase para cargar imágenes más rápido */}
                <link rel="preconnect" href="https://sinpfcbinaiasorunmpz.supabase.co" />
                <link rel="dns-prefetch" href="https://sinpfcbinaiasorunmpz.supabase.co" />
            </head>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                {children}
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    )
}