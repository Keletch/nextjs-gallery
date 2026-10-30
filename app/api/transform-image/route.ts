import { NextRequest, NextResponse } from 'next/server'
import { verifyModerator } from '@/lib/auth-check'
import { supabase } from '@/lib/supabase-admin'
import { isValidEventRoute, isValidFilename, isModerationFolder } from '@/lib/validate'
import sharp from 'sharp'
import { PHOTO_CACHE_CONTROL, hashOf, photoFile } from '@/lib/photos'

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

    if (!isValidFilename(filename) || !isValidEventRoute(evento) || !isModerationFolder(folder)) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
    }

    if ((rotation !== undefined && typeof rotation !== 'number') || ![0, 90, 180, 270, -90, -180, -270].includes(rotation ?? 0)) {
      return NextResponse.json({ error: 'Rotación inválida' }, { status: 400 })
    }


    // Cada cambio sube la versión y guarda archivos con otro nombre: con caché de un año, sobrescribir el
    // mismo nombre seguiría mostrando la foto anterior (ver lib/photos.ts)
    const hash = hashOf(filename)
    const { data: info, error: infoError } = await supabase
      .from('imageInfo')
      .select('*') // '*' por si aún no existe "version"
      .eq('imghash', hash)
      .maybeSingle()

    if (infoError || !info) {
      return NextResponse.json({ error: 'No se encontró el registro de la foto' }, { status: 404 })
    }
    if (info.version === undefined) {
      return NextResponse.json({ error: 'Falta agregar la columna "version" en Supabase' }, { status: 500 })
    }

    const newFile = photoFile(hash, info.version + 1)

    const { data: originalFile, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(`${evento}/${folder}/${filename}`)

    if (downloadError || !originalFile) {
      return NextResponse.json(
        { error: 'No se pudo descargar la imagen original' },
        { status: 500 }
      )
    }

    let transformer = sharp(Buffer.from(await originalFile.arrayBuffer()))
    if (rotation) transformer = transformer.rotate(rotation)
    if (flipH || flipV) transformer = transformer.flip(flipV).flop(flipH)
    const original = await transformer.webp({ quality: 95, effort: 4 }).toBuffer()

    // Miniatura y mediana salen de la original ya transformada (mismos tamaños que en /api/upload)
    const thumb = await sharp(original)
      .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 })
      .toBuffer()
    const medium = await sharp(original)
      .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer()

    for (const [path, buffer] of [
      [`${evento}/${folder}/${newFile}`, original],
      [`${evento}/thumbnails/thumb_${newFile}`, thumb],
      [`${evento}/medium/med_${newFile}`, medium],
    ] as const) {
      const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
        contentType: 'image/webp',
        cacheControl: PHOTO_CACHE_CONTROL,
        upsert: true,
      })
      if (error) {
        console.error('[transform-image] Error al subir', path, error)
        return NextResponse.json({ error: 'Error al guardar imagen transformada' }, { status: 500 })
      }
    }

    // La galería abierta recibe este cambio por Realtime y cambia a la versión nueva
    const { error: versionError } = await supabase
      .from('imageInfo')
      .update({ version: info.version + 1 })
      .eq('imghash', hash)

    if (versionError) {
      console.error('[transform-image] Error al actualizar versión:', versionError)
      return NextResponse.json({ error: 'Error al guardar imagen transformada' }, { status: 500 })
    }

    // Los archivos de la versión anterior ya no los usa nadie (la mediana puede no existir en fotos viejas)
    const { error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove([
        `${evento}/${folder}/${filename}`,
        `${evento}/thumbnails/thumb_${filename}`,
        `${evento}/medium/med_${filename}`,
      ])
    if (removeError) console.error('[transform-image] No se borró la versión anterior:', removeError)

    return NextResponse.json({
      success: true,
      message: 'Imagen transformada correctamente',
      filename: newFile,
    })
  } catch (err) {
    console.error('[transform-image] Error:', err)
    return NextResponse.json(
      { error: 'Error al transformar imagen' },
      { status: 500 }
    )
  }
}