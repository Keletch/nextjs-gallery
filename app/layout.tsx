import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"

if (process.env.NODE_ENV === 'development') {
  const originalError = console.error
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Failed to parse cookie string')
    ) {
      return
    }
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

export const metadata: Metadata = {
  title: "Galería CDI | Mod",
  description: "Espacio para moderar las imágenes subidas",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}