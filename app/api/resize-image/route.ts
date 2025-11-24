import { NextRequest, NextResponse } from 'next/server'
import { verifyModerator } from '@/lib/auth-check'
import { supabase } from '@/lib/supabase-admin'
import sharp from 'sharp'

const BUCKET = 'nextjsGallery'

export async function POST(req: NextRequest) {
  try {
    const { authorized, reason } = await verifyModerator()

    if (!authorized) {
      return NextResponse.json({ error: reason }, { status: 401 })
    }

    const { filename, evento, folder } = await req.json()

    if (!filename || !evento || !folder) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    const originalPath = `${evento}/${folder}/${filename}`

    // Descargar imagen original
    const { data: originalFile, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(originalPath)

    if (downloadError || !originalFile) {
      return NextResponse.json(
        { error: 'No se pudo descargar la imagen' },
        { status: 500 }
      )
    }

    const originalBuffer = Buffer.from(await originalFile.arrayBuffer())
    const originalSize = originalBuffer.length

    // Verificar que pese más de 1MB
    if (originalSize < 1024 * 1024) {
      return NextResponse.json(
        { error: 'La imagen pesa menos de 1MB' },
        { status: 400 }
      )
    }

    // Obtener dimensiones originales
    const metadata = await sharp(originalBuffer).metadata()
    const originalWidth = metadata.width || 0
    const originalHeight = metadata.height || 0

    // Calcular 80% del tamaño
    const targetWidth = Math.round(originalWidth * 0.8)
    const targetHeight = Math.round(originalHeight * 0.8)

    // Redimensionar con calidad 90%
    const resizedBuffer = await sharp(originalBuffer)
      .resize({
        width: targetWidth,
        height: targetHeight,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 90, effort: 4 })
      .toBuffer()

    const newSize = resizedBuffer.length

    // Subir imagen redimensionada
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(originalPath, resizedBuffer, {
        contentType: 'image/webp',
        upsert: true,
      })

    if (uploadError) {
      console.error('[resize-image] Error al subir:', uploadError)
      return NextResponse.json(
        { error: 'Error al guardar imagen redimensionada' },
        { status: 500 }
      )
    }

    const formatSize = (bytes: number) => {
      const mb = bytes / (1024 * 1024)
      return mb >= 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(2)} KB`
    }

    return NextResponse.json({
      success: true,
      originalSize: formatSize(originalSize),
      newSize: formatSize(newSize),
      reduction: `${(((originalSize - newSize) / originalSize) * 100).toFixed(1)}%`,
    })
  } catch (err) {
    console.error('[resize-image] Error:', err)
    return NextResponse.json(
      { error: 'Error al redimensionar imagen' },
      { status: 500 }
    )
  }
}