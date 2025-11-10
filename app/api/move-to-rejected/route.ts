import { NextRequest, NextResponse } from 'next/server'
import { verifyModerator } from '@/lib/auth-check'
import { moveFile, logAction } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { authorized, reason } = await verifyModerator()

    if (!authorized) {
      return NextResponse.json({ error: reason }, { status: 401 })
    }

    const { filename, from, evento } = await req.json()

    if (!filename || !from || !evento) {
      return NextResponse.json({ error: 'Faltan parámetros: filename, from o evento' }, { status: 400 })
    }

    const fromPath = `${evento}/${from}`
    const toPath = `${evento}/rejected`

    await moveFile(filename, fromPath, toPath)

    await logAction({
      filename,
      action: 'move-to-rejected',
      from: fromPath,
      to: toPath,
      device: 'server',
      browser: 'n/a',
      os: 'n/a',
      location: 'n/a',
      evento,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'No se pudo mover la imagen' }, { status: 500 })
  }
}