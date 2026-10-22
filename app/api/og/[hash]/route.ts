import sharp from 'sharp'
import { supabaseServer } from '@/lib/supabase-server'

// Vista previa (og:image) de una foto compartida: 1200×630 en JPG ligero.
// La original es WebP de ~1 MB: WhatsApp ignora imágenes tan pesadas y LinkedIn no lee WebP.
const STORAGE_BASE = 'https://sinpfcbinaiasorunmpz.supabase.co/storage/v1/object/public/nextjsGallery'

export async function GET(_req: Request, { params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params
  if (!/^[0-9a-f]{64}$/.test(hash)) return new Response('Not found', { status: 404 })

  // El evento sale de la base, no de la URL
  const { data: info } = await supabaseServer
    .from('imageInfo')
    .select('evento')
    .eq('imghash', hash)
    .maybeSingle()
  if (!info) return new Response('Not found', { status: 404 })

  const res = await fetch(`${STORAGE_BASE}/${info.evento}/approved/${hash}.webp`)
  if (!res.ok) return new Response('Not found', { status: 404 })

  const jpg = await sharp(Buffer.from(await res.arrayBuffer()))
    .rotate()
    .resize(1200, 630, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer()

  return new Response(new Uint8Array(jpg), {
    headers: {
      'Content-Type': 'image/jpeg',
      // Un día en la CDN: si la foto se rota en moderación, la vista previa se actualiza sola
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
