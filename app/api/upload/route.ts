import sharp from 'sharp'
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { logAction, supabase } from '@/lib/supabase-admin'
import { checkRateLimit } from '@/lib/rate-limit'

const MAX_SIZE_MB = 50
const RESIZE_THRESHOLD_MB = 10
const MIN_RESOLUTION = 8000000 // 8 megapíxeles
const BUCKET = 'nextjsGallery'
const RESIZE_TARGET = 1980
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
// Límites de subida por IP
const UPLOADS_PER_MINUTE = 40
const UPLOADS_PER_DAY = 300

function hashBuffer(buffer: Buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting PRIMERO (antes de procesar nada)
    // x-forwarded-for puede traer una lista "cliente, proxy1, proxy2": usar solo el cliente
    const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const ip = forwarded || req.headers.get('x-real-ip') || 'unknown'

    // En un evento muchos asistentes comparten el WiFi y salen con la misma IP, así que el límite
    // por minuto es holgado y un tope diario frena abusos sostenidos
    if (!(await checkRateLimit(`upload:${ip}`, UPLOADS_PER_MINUTE, 60_000))) {
      return NextResponse.json({ error: 'Demasiadas subidas seguidas. Espera un minuto e intenta de nuevo.' }, { status: 429 })
    }
    if (!(await checkRateLimit(`upload-day:${ip}`, UPLOADS_PER_DAY, 24 * 60 * 60_000))) {
      return NextResponse.json({ error: 'Se alcanzó el límite de subidas de hoy desde esta red. Intenta mañana.' }, { status: 429 })
    }

    // Leer el cuerpo antes de tocar req
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
      return NextResponse.json({ error: 'Archivo demasiado grande (máx 50MB)' }, { status: 413 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const metadata = await sharp(buffer).metadata()
    const resolution = (metadata.width ?? 0) * (metadata.height ?? 0)
    const needsResize = resolution >= MIN_RESOLUTION && sizeMB > RESIZE_THRESHOLD_MB

    // .rotate() sin argumentos endereza la foto según su EXIF (las del celular vienen de lado) antes de
    // que la conversión a webp borre ese dato
    const resizedBuffer = needsResize
      ? await sharp(buffer)
        .rotate()
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
      .select('*') // '*' por si aún no existe "oculto"
      .eq('id', eventId)
      .single()

    if (eventError || !eventData?.ruta || eventData.oculto === true) {
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
      .rotate()
      .webp({ quality: 95, effort: 4 })
      .toBuffer()

    // 480 px: en el muro una foto se ve a ~180–450 px. Con 800 px el cambio de evento se trababa
    // decodificando decenas de fotos grandes a la vez (y gastaban ~3× más tráfico)
    const thumbnailBuffer = await sharp(resizedBuffer)
      .rotate()
      .resize({
        width: 480,
        height: 480,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 78, effort: 4 })
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
      // '' y no null: description es parte de la llave primaria de imageInfo y no acepta null
      // (con null fallaba toda subida sin descripción)
      description: description?.trim() || '',
    })

    if (dbError) {
      console.error('[UPLOAD] Error al registrar en imageInfo:', dbError)
      // Sin registro la foto no sirve (el visor y compartir la buscan ahí): se quitan sus archivos
      await supabase.storage
        .from(BUCKET)
        .remove([`${ruta}/pending/${originalFilename}`, `${ruta}/thumbnails/${thumbnailFilename}`])
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