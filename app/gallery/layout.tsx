import { Metadata } from 'next'
import { supabaseServer } from '@/lib/supabase-server'

type Props = {
  searchParams: Promise<{ open?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const hash = params?.open

  if (!hash || hash.length !== 64) {
    return {
      title: 'Galería CDI',
      description: 'Comparte tus experiencias con nuestra comunidad',
      openGraph: {
        images: ['https://galeria.chu.mx/SHIFT.png'],
      },
    }
  }

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
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: info.description || 'Imagen de galería',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      images: [imageUrl],
    },
  }
}

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children
}