import sharp from 'sharp'
import { supabaseServer } from '@/lib/supabase-server'
import { photoFile } from '@/lib/photos'

// Vista previa (og:image) de una foto compartida: 1200×630 en JPG ligero.
// La original es WebP de ~1 MB: WhatsApp ignora imágenes tan pesadas y LinkedIn no lee WebP.
const STORAGE_BASE = 'https://sinpfcbinaiasorunmpz.supabase.co/storage/v1/object/public/nextjsGallery'

export async function GET(_req: Request, { params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params
  if (!/^[0-9a-f]{64}$/.test(hash)) return new Response('Not found', { status: 404 })

  // El evento sale de la base, no de la URL
  const { data: info } = await supabaseServer
    .from('imageInfo')
    .select('*') // '*' por si aún no existe "version"
    .eq('imghash', hash)
    .maybeSingle()
  if (!info) return new Response('Not found', { status: 404 })

  // La mediana basta para 1200×630; las fotos viejas sin mediana usan la original
  const file = photoFile(hash, info.version)
  let res = await fetch(`${STORAGE_BASE}/${info.evento}/medium/med_${file}`)
  if (!res.ok) res = await fetch(`${STORAGE_BASE}/${info.evento}/approved/${file}`)
  if (!res.ok) return new Response('Not found', { status: 404 })

  // Foto completa al centro sobre la misma foto ampliada y desenfocada: recortarla a 1200×630
  // (fit cover) cortaba cabezas y, en fotos verticales, más de la mitad de la imagen
  const photo = await sharp(Buffer.from(await res.arrayBuffer())).rotate().toBuffer()
  const background = await sharp(photo)
    .resize(1200, 630, { fit: 'cover' })
    .blur(40)
    .modulate({ brightness: 0.6 })
    .toBuffer()
  const foreground = await sharp(photo).resize(1200, 630, { fit: 'inside' }).toBuffer()

  const jpg = await sharp(background)
    .composite([{ input: foreground, gravity: 'center' }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer()

  return new Response(new Uint8Array(jpg), {
    headers: {
      'Content-Type': 'image/jpeg',
      // Un día en la CDN; al rotar o voltear la foto la página pide ?v=<versión> y no usa esta copia
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
