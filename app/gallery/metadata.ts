import { supabaseServer } from '@/lib/supabase-server'

export async function generateMetadata({ searchParams }: { searchParams: URLSearchParams }) {
  const hash = searchParams.get('open')

  let title = 'Galería CDI'
  let description = 'Galería de eventos'
  let imageUrl = 'https://galeria.chu.mx/SHIFT.png' // ✅ Imagen por defecto (fallback)

  // 🔍 Si hay hash válido, consulta Supabase
  if (hash && hash.length === 64) {
    const { data: info, error } = await supabaseServer
      .from('imageInfo')
      .select('evento, description')
      .eq('imghash', hash)
      .maybeSingle()

    if (!error && info) {
      const eventoRaw = info.evento
      description = info.description || description
      imageUrl = `https://sinpfcbinaiasorunmpz.supabase.co/storage/v1/object/public/nextjsGallery/${eventoRaw}/approved/${hash}.webp`
      console.log('✅ Metadatos generados dinámicamente para hash:', hash)
    } else {
      console.log('ℹ️ No se encontró información para hash:', hash)
    }
  } else {
    console.log('ℹ️ No hay hash válido en la URL.')
  }

  // 🧠 Devuelve la metadata completa
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: 'website',
      url: `https://galeria.chu.mx/gallery${hash ? `?open=${hash}` : ''}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}
