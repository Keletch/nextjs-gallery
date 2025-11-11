import { supabaseServer } from '@/lib/supabase-server'

export async function generateMetadata({ searchParams }: { searchParams: URLSearchParams }) {
  const hash = searchParams.get('open')

  let title = 'Galería CDI'
  let description = 'Imagen compartida desde la galería'
  let imageUrl = 'https://galeria.chu.mx/default-preview.png'

  if (hash && hash.length === 64) {
    
    const { data: info, error } = await supabaseServer
      .from('imageInfo')
      .select('evento, description')
      .eq('imghash', hash)
      .maybeSingle()

    if (error) console.error('⚠️ Error al consultar Supabase:', error)
    else console.log('✅ Datos obtenidos:', info)

    if (info) {
      const eventoRaw = info.evento
      description = info.description || description
      imageUrl = `https://sinpfcbinaiasorunmpz.supabase.co/storage/v1/object/public/nextjsGallery/${eventoRaw}/approved/${hash}.webp`
    }
  } else {
    console.log('ℹ️ No hay hash válido en la URL.')
  }

  const metadata = {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [imageUrl],
      url: `https://galeria.chu.mx/gallery?open=${hash}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      image: imageUrl,
    },
  }

  return metadata
}
