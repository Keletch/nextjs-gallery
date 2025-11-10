import { NextRequest, NextResponse } from 'next/server'
import { verifyModerator } from '@/lib/auth-check'
import { moveFile, logAction } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { authorized, reason } = await verifyModerator()

    if (!authorized) {
      return NextResponse.json({ error: reason }, { status: 401 })
    }

    const body = await req.json()
    const { filename, evento } = body

    if (!filename || !evento) {
      return NextResponse.json({ error: 'Faltan parámetros: filename o evento' }, { status: 400 })
    }

    const from = `${evento}/pending`
    const to = `${evento}/approved`

    await moveFile(filename, from, to)

    await logAction({
      filename,
      action: 'move-to-approved',
      from,
      to,
      device: 'server',
      browser: 'n/a',
      os: 'n/a',
      location: 'n/a',
      evento,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[approved] ❌ Error al mover imagen:', err)
    return NextResponse.json({ error: 'No se pudo mover la imagen' }, { status: 500 })
  }
}