import { NextRequest, NextResponse } from 'next/server'
import { uploadToBucket, logAction } from '@/lib/supabase'

const MAX_SIZE_MB = 5
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function parseUserAgent(ua: string) {
  const device = /mobile/i.test(ua)
    ? 'móvil'
    : /tablet/i.test(ua)
    ? 'tablet'
    : 'escritorio'

  const browserMatch = ua.match(/(Chrome|Safari|Firefox|Edge|Opera|MSIE|Trident)/i)
  const browser = browserMatch ? browserMatch[1] : 'desconocido'

  const osMatch = ua.match(/(Windows NT|Mac OS X|Android|iPhone|iPad|Linux)/i)
  const os = osMatch ? osMatch[1] : 'desconocido'

  return { device, browser, os }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData()
    const file = data.get('image') as File

    if (!file) {
      return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 415 })
    }

    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > MAX_SIZE_MB) {
      return NextResponse.json({ error: 'Archivo demasiado grande (máx 5MB)' }, { status: 413 })
    }

    // 📦 Subir a Supabase Storage
    const filename = await uploadToBucket(file, 'pending')

    // 📍 Extraer datos del cliente
    const userAgent = req.headers.get('user-agent') || ''
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'desconocida'
    const { device, browser, os } = parseUserAgent(userAgent)

    // 🌍 Obtener ubicación aproximada
    let location = 'desconocida'
    try {
      const geoRes = await fetch(`https://ipapi.co/${ip}/json`)
      const geo = await geoRes.json()
      location = `${geo.city}, ${geo.region}, ${geo.country_name}`
    } catch {
      // si falla, dejamos "desconocida"
    }

    // 📝 Registrar en la tabla logs
    await logAction({
      filename,
      action: 'upload',
      from: 'client',
      to: 'pending',
      device,
      browser,
      os,
      location,
    })

    return new Response('Imagen subida correctamente y pendiente de aprobación', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  } catch (err) {
    console.error('Error al procesar la subida:', err)
    return NextResponse.json({ error: 'Error interno al guardar imagen' }, { status: 500 })
  }
}