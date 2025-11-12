import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

// ⚙️ Ignora los warnings de Supabase en modo dev
if (process.env.NODE_ENV === 'development') {
  const originalError = console.error
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Failed to parse cookie string')) return
    originalError(...args)
  }
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

// 🌐 Metadatos neutros (fallback si no hay dinámicos)
export const metadata: Metadata = {
  title: "Galería CDI",
  description: "Explora y comparte imágenes desde la galería de CDI.",
  openGraph: {
    title: "Galería CDI",
    description: "Explora y comparte imágenes desde la galería de CDI.",
    images: [
      {
        url: "https://galeria.chu.mx/SHIFT.png",
        width: 1200,
        height: 630,
        alt: "Galería CDI",
      },
    ],
    type: "website",
    url: "https://galeria.chu.mx/gallery",
  },
  twitter: {
    card: "summary_large_image",
    title: "Galería CDI",
    description: "Explora y comparte imágenes desde la galería de CDI.",
    images: ["https://galeria.chu.mx/SHIFT.png"],
  },
}

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
