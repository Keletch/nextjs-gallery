import { NextRequest, NextResponse } from 'next/server'
import { verifyModerator } from '@/lib/auth-check'
import { moveFile, logAction } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { authorized, reason } = await verifyModerator()

    if (!authorized) {
      return NextResponse.json({ error: reason }, { status: 401 })
    }

    const { filename, from } = await req.json()

    if (!filename || !from) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    await moveFile(filename, from, 'approved')

    await logAction({
      filename,
      action: 'move-to-approved',
      from,
      to: 'approved',
      device: 'server',
      browser: 'n/a',
      os: 'n/a',
      location: 'n/a',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'No se pudo mover la imagen' }, { status: 500 })
  }
}