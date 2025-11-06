import { NextRequest, NextResponse } from 'next/server'
import { verifyModerator } from '@/lib/auth-check'
import { deleteFile, logAction } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { authorized, reason } = await verifyModerator()

    if (!authorized) {
      return NextResponse.json({ error: reason }, { status: 401 })
    }

    const { filename, folder } = await req.json()

    if (!filename || !folder) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

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
    return NextResponse.json({ error: 'No se pudo eliminar la imagen' }, { status: 500 })
  }
}