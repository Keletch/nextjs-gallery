import { Metadata } from 'next'
import { supabaseServer } from '@/lib/supabase-server'
import GalleryClient from './GalleryClient'

// Forzar dynamic rendering para metadata
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = {
  searchParams: Promise<{ open?: string }>
}

// Vista previa al compartir la galería (sin foto específica). El título usa la plantilla del layout
// ("%s | Galería CDI"); antes decía "Galería CDI" y quedaba "Galería CDI | Galería CDI".
const GALLERY_TITLE = 'Fotos de eventos'
const GALLERY_DESCRIPTION = 'Comparte tus experiencias con nuestra comunidad'
const GALLERY_METADATA: Metadata = {
  title: GALLERY_TITLE,
  description: GALLERY_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: 'Galería CDI',
    title: `${GALLERY_TITLE} | Galería CDI`,
    description: GALLERY_DESCRIPTION,
    url: 'https://galeria.chu.mx/gallery',
    images: [{ url: 'https://galeria.chu.mx/og.jpg', width: 1200, height: 630, alt: 'Galería CDI' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${GALLERY_TITLE} | Galería CDI`,
    description: GALLERY_DESCRIPTION,
    images: ['https://galeria.chu.mx/og.jpg'],
  },
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const searchParams = await props.searchParams
  const hash = searchParams?.open

  if (!hash || hash.length !== 64) {
    return GALLERY_METADATA
  }

  try {
    const { data: info } = await supabaseServer
      .from('imageInfo')
      .select('evento, description')
      .eq('imghash', hash)
      .maybeSingle()

    if (!info) {
      return GALLERY_METADATA
    }

    const imageUrl = `https://sinpfcbinaiasorunmpz.supabase.co/storage/v1/object/public/nextjsGallery/${info.evento}/approved/${hash}.webp`

    return {
      title: info.description || 'Imagen',
      description: info.description || 'Comparte tus experiencias con nuestra comunidad',
      openGraph: {
        title: info.description || 'Galería CDI',
        description: 'El Club de Inversionistas',
        url: `https://galeria.chu.mx/gallery?open=${hash}`,
        siteName: 'Galería CDI',
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: info.description || 'Imagen de galería',
          },
        ],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: info.description || 'Galería CDI',
        description: 'El Club de Inversionistas',
        images: [imageUrl],
      },
    }
  } catch (error) {
    console.error('Error generando metadata:', error)
    return GALLERY_METADATA
  }
}

export default function GalleryPage() {
  return <GalleryClient />
}