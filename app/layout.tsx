import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css"

// ⚙️ Ignora los warnings de Supabase en modo dev
if (process.env.NODE_ENV === 'development') {
  const originalError = console.error
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Failed to parse cookie string')) return
    originalError(...args)
  }
}

// ⚡ Optimización de fonts
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

// Metadata básica (fallback)
export const metadata: Metadata = {
  title: "Galería CDI",
  description: "Comparte tus experiencias con nuestra comunidad",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        {/* ⚡ Preconnect a Supabase para cargar imágenes más rápido */}
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