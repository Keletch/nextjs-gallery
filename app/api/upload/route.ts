import sharp from 'sharp'
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { logAction } from '@/lib/supabase'

const MAX_SIZE_MB = 10
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const BUCKET = 'nextjsGallery'

function hashBuffer(buffer: Buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

export async function POST(req: NextRequest) {
  const res = NextResponse.next()

  try {
    const supabase = createMiddlewareClient({ req, res })

    const formData = await req.formData()
    const file = formData.get('image') as File
    const eventId = formData.get('event') as string
    const description = formData.get('description') as string | null

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ error: 'No se seleccionó evento válido' }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 415 })
    }

    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > MAX_SIZE_MB) {
      return NextResponse.json({ error: 'Archivo demasiado grande (máx 10MB)' }, { status: 413 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const hash = hashBuffer(buffer)
    const baseName = `${hash}.webp`

    const originalFilename = baseName
    const thumbnailFilename = `thumb_${baseName}`

    // 🔍 Obtener ruta del evento desde tabla events
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('ruta')
      .eq('id', eventId)
      .single()

    if (eventError || !eventData?.ruta) {
      console.error('[UPLOAD] Evento no encontrado:', eventError)
      return NextResponse.json({ error: 'Evento inválido o no registrado' }, { status: 400 })
    }

    const ruta = eventData.ruta

    // 🔒 Verificación de duplicado vía tabla imageInfo
    const { data: existing, error: queryError } = await supabase
      .from('imageInfo')
      .select('imghash')
      .eq('imghash', hash)
      .single()

    if (queryError && queryError.code !== 'PGRST116') {
      console.error('[UPLOAD] Error al consultar duplicado en imageInfo:', queryError)
      return NextResponse.json({ error: 'No se pudo verificar duplicados' }, { status: 500 })
    }

    if (existing) {
      console.warn('[UPLOAD] Imagen duplicada detectada en imageInfo:', hash)
      return NextResponse.json({ error: 'Ya subiste esta imagen antes. Intenta con otra distinta.' }, { status: 409 })
    }

    const originalBuffer = await sharp(buffer)
      .webp({ quality: 95, effort: 4 })
      .toBuffer()

    const metadata = await sharp(buffer).metadata()
    const cropSize = 800

    let thumbnailBuffer: Buffer
    if ((metadata.width || 0) >= cropSize && (metadata.height || 0) >= cropSize) {
      const left = Math.floor(((metadata.width ?? cropSize) - cropSize) / 2)
      const top = Math.floor(((metadata.height ?? cropSize) - cropSize) / 2)

      thumbnailBuffer = await sharp(buffer)
        .extract({ left, top, width: cropSize, height: cropSize })
        .webp({ quality: 80, effort: 3 })
        .toBuffer()
    } else {
      thumbnailBuffer = await sharp(buffer)
        .resize({ width: cropSize })
        .webp({ quality: 80, effort: 3 })
        .toBuffer()
    }

    // 🧱 Subida a carpeta dinámica por evento
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(`${ruta}/pending/${originalFilename}`, originalBuffer, {
        contentType: 'image/webp',
        upsert: false,
      })
    if (uploadError) throw uploadError

    const { error: thumbError } = await supabase.storage
      .from(BUCKET)
      .upload(`${ruta}/thumbnails/${thumbnailFilename}`, thumbnailBuffer, {
        contentType: 'image/webp',
        upsert: false,
      })
    if (thumbError) throw thumbError

    // 🧾 Registro en tabla imageInfo
    const { error: dbError } = await supabase.from('imageInfo').insert({
      imghash: hash,
      evento: ruta,
      description: description || null,
    })

    if (dbError) {
      console.error('[UPLOAD] Error al registrar en imageInfo:', dbError)
      return NextResponse.json({ error: 'Error al registrar imagen en base de datos' }, { status: 500 })
    }

    // 🧮 Registro en tabla logs
    await logAction({
      filename: originalFilename,
      action: 'upload-image',
      from: `${ruta}/pending`,
      to: 'n/a',
      device: 'client',
      browser: 'n/a',
      os: 'n/a',
      location: 'n/a',
      evento: ruta,
    })

    return new Response('Imagen subida exitosamente... Esperando aprobación de algún moderador')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    console.error('[UPLOAD] Error al procesar la subida:', message)

    let userMessage = 'Error interno al guardar imagen...'

    if (message === 'The resource already exists') {
      userMessage += ' Esta imagen ya existe en nuestra base de datos.'
    }

    return NextResponse.json({ error: userMessage }, { status: 500 })
  }
}