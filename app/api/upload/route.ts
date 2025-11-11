import sharp from 'sharp'
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { logAction } from '@/lib/supabase'

const MAX_SIZE_MB = 50
const RESIZE_THRESHOLD_MB = 10
const MIN_RESOLUTION = 8000000 // 8 megapíxeles
const BUCKET = 'nextjsGallery'
const RESIZE_TARGET = 1980
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function hashBuffer(buffer: Buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

export async function POST(req: NextRequest) {
  try {
    // ✅ Leer el cuerpo antes de tocar req
    const formData = await req.formData()
    const file = formData.get('image') as File
    const eventId = formData.get('event') as string
    const description = formData.get('description') as string | null

    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req, res })

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
      return NextResponse.json({ error: 'Archivo demasiado grande (máx 50MB)' }, { status: 413 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const metadata = await sharp(buffer).metadata()
    const resolution = (metadata.width ?? 0) * (metadata.height ?? 0)
    const needsResize = resolution >= MIN_RESOLUTION && sizeMB > RESIZE_THRESHOLD_MB

    const resizedBuffer = needsResize
      ? await sharp(buffer)
          .resize({
            width: RESIZE_TARGET,
            height: RESIZE_TARGET,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .toBuffer()
      : buffer

    const hash = hashBuffer(resizedBuffer)
    const baseName = `${hash}.webp`
    const originalFilename = baseName
    const thumbnailFilename = `thumb_${baseName}`

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

    const originalBuffer = await sharp(resizedBuffer)
      .webp({ quality: 95, effort: 4 })
      .toBuffer()

    const thumbnailBuffer = await sharp(resizedBuffer)
      .resize({
        width: 800,
        height: 800,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80, effort: 3 })
      .toBuffer()

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

    const { error: dbError } = await supabase.from('imageInfo').insert({
      imghash: hash,
      evento: ruta,
      description: description || null,
    })

    if (dbError) {
      console.error('[UPLOAD] Error al registrar en imageInfo:', dbError)
      return NextResponse.json({ error: 'Error al registrar imagen en base de datos' }, { status: 500 })
    }

    await logAction({
      filename: originalFilename,
      action: 'upload-image',
      from: `${ruta}/pending`,
      to: 'n/a',
      device: 'client',
      browser: 'n/a',
      os: 'n/a',
      location: needsResize ? 'resized' : 'original',
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