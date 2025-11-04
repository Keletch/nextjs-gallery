import { NextRequest, NextResponse } from 'next/server'
import { deleteFile, logAction } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { filename, folder } = await req.json()

  if (!filename || !folder) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
  }

  try {
    await deleteFile(filename, folder)

    await logAction({
      filename,
      action: 'delete',
      from: folder,
      to: 'none',
      device: 'server',
      browser: 'n/a',
      os: 'n/a',
      location: 'n/a',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error al eliminar imagen:', err)
    return NextResponse.json({ error: 'No se pudo eliminar la imagen' }, { status: 500 })
  }
}