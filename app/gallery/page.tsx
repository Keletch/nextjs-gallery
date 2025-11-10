import GalleryClient from './GalleryClient'
import { supabaseServer } from '@/lib/supabase-server'

export async function generateMetadata({ searchParams }: { searchParams: { open?: string } }) {
  const hash = searchParams.open
  if (!hash || hash.length !== 64) return {}

  const { data } = await supabaseServer
    .from('imageInfo')
    .select('evento, description')
    .eq('imghash', hash)
    .maybeSingle()

  const eventoRaw = data?.evento || 'Evento'
  const description = data?.description || 'Descripcion'

  const { data: eventoData } = await supabaseServer
    .from('events')
    .select('nombre')
    .eq('ruta', eventoRaw)
    .maybeSingle()

  const eventoNombre = eventoData?.nombre || eventoRaw

  const imageUrl = `https://sinpfcbinaiasorunmpz.supabase.co/storage/v1/object/public/nextjsGallery/${eventoRaw}/approved/${hash}.webp`

  return {
    title: `Evento: ${eventoNombre}`,
    description,
    openGraph: {
      title: `Evento: ${eventoNombre}`,
      description,
      images: [imageUrl],
      url: `http://galeria.chu.mx/gallery?open=${hash}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Evento: ${eventoNombre}`,
      description,
      images: [imageUrl],
    },
  }
}

export default function GalleryPage() {
  return <GalleryClient />
}