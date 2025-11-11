import { NextRequest, NextResponse } from 'next/server'
import { verifyModerator } from '@/lib/auth-check'
import { deleteFile, logAction, supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { authorized, reason } = await verifyModerator()

    if (!authorized) {
      return NextResponse.json({ error: reason }, { status: 401 })
    }

    const { filename, evento } = await req.json()

    if (!filename || !evento) {
      return NextResponse.json({ error: 'Faltan parámetros: filename o evento' }, { status: 400 })
    }

    const hash = filename.replace(/\.webp$/, '')

    await deleteFile(filename, `${evento}/rejected`)

    await deleteFile(`${hash}.webp`, `${evento}/approved`)

    await deleteFile(`thumb_${hash}.webp`, `${evento}/thumbnails`)

    const { error: deleteError } = await supabase
      .from('imageInfo')
      .delete()
      .eq('imghash', hash)

    if (deleteError) {
      console.error('[delete-image] ❌ Error al eliminar registro en imageInfo:', deleteError)
      return NextResponse.json({ error: 'No se pudo eliminar el registro en base de datos' }, { status: 500 })
    }

    await logAction({
      filename,
      action: 'delete-image',
      from: `${evento}`,
      to: 'n/a',
      device: 'server',
      browser: 'n/a',
      os: 'n/a',
      location: 'n/a',
      evento,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[delete-image] ❌ Error al eliminar imagen:', err)
    return NextResponse.json({ error: 'No se pudo eliminar la imagen' }, { status: 500 })
  }
}