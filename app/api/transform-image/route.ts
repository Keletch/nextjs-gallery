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

    const { filename, evento, folder, rotation, flipH, flipV } = await req.json()

    if (!filename || !evento || !folder) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      )
    }

    const hash = filename.replace(/\.webp$/, '')

    // Rutas de los archivos
    const originalPath = `${evento}/${folder}/${filename}`
    const thumbPath = `${evento}/thumbnails/thumb_${filename}`

    // Función para aplicar transformaciones
    const applyTransform = async (buffer: Buffer) => {
      let transformer = sharp(buffer)

      // Aplicar rotación
      if (rotation && rotation !== 0) {
        transformer = transformer.rotate(rotation)
      }

      // Aplicar volteos
      if (flipH || flipV) {
        transformer = transformer.flip(flipV).flop(flipH)
      }

      return transformer.webp({ quality: 95, effort: 4 }).toBuffer()
    }

    // 1. Transformar imagen original
    const { data: originalFile, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(originalPath)

    if (downloadError || !originalFile) {
      return NextResponse.json(
        { error: 'No se pudo descargar la imagen original' },
        { status: 500 }
      )
    }

    const originalBuffer = Buffer.from(await originalFile.arrayBuffer())
    const transformedOriginal = await applyTransform(originalBuffer)

    // Subir imagen original transformada
    const { error: uploadOriginalError } = await supabase.storage
      .from(BUCKET)
      .upload(originalPath, transformedOriginal, {
        contentType: 'image/webp',
        upsert: true,
      })

    if (uploadOriginalError) {
      console.error('[transform-image] Error al subir original:', uploadOriginalError)
      return NextResponse.json(
        { error: 'Error al guardar imagen transformada' },
        { status: 500 }
      )
    }

    // 2. Transformar thumbnail
    const { data: thumbFile, error: thumbDownloadError } = await supabase.storage
      .from(BUCKET)
      .download(thumbPath)

    if (thumbDownloadError || !thumbFile) {
      console.warn('[transform-image] No se pudo descargar thumbnail, continuando...')
    } else {
      const thumbBuffer = Buffer.from(await thumbFile.arrayBuffer())

      // Aplicar mismas transformaciones al thumbnail
      let thumbTransformer = sharp(thumbBuffer)

      if (rotation && rotation !== 0) {
        thumbTransformer = thumbTransformer.rotate(rotation)
      }

      if (flipH || flipV) {
        thumbTransformer = thumbTransformer.flip(flipV).flop(flipH)
      }

      const transformedThumb = await thumbTransformer
        .webp({ quality: 80, effort: 3 })
        .toBuffer()

      await supabase.storage.from(BUCKET).upload(thumbPath, transformedThumb, {
        contentType: 'image/webp',
        upsert: true,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Imagen transformada correctamente',
    })
  } catch (err) {
    console.error('[transform-image] Error:', err)
    return NextResponse.json(
      { error: 'Error al transformar imagen' },
      { status: 500 }
    )
  }
}