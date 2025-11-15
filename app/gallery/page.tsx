import { Metadata } from 'next'
import { supabaseServer } from '@/lib/supabase-server'
import GalleryClient from './GalleryClient'

// ⚠️ CRÍTICO: Forzar dynamic rendering para metadata
export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = {
  searchParams: { open?: string }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const hash = props.searchParams?.open

  if (!hash || hash.length !== 64) {
    return {
      title: 'Galería CDI',
      description: 'Comparte tus experiencias con nuestra comunidad',
      openGraph: {
        images: ['https://galeria.chu.mx/SHIFT.png'],
      },
    }
  }

  try {
    const { data: info } = await supabaseServer
      .from('imageInfo')
      .select('evento, description')
      .eq('imghash', hash)
      .maybeSingle()

    if (!info) {
      return {
        title: 'Galería CDI',
        openGraph: {
          images: ['https://galeria.chu.mx/SHIFT.png'],
        },
      }
    }

    const imageUrl = `https://sinpfcbinaiasorunmpz.supabase.co/storage/v1/object/public/nextjsGallery/${info.evento}/approved/${hash}.webp`

    return {
      title: `${info.description || 'Imagen'} - Galería CDI`,
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
    return {
      title: 'Galería CDI',
      openGraph: {
        images: ['https://galeria.chu.mx/SHIFT.png'],
      },
    }
  }
}

export default function GalleryPage() {
  return <GalleryClient />
}