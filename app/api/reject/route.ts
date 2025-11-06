import { NextRequest, NextResponse } from 'next/server'
import { verifyModerator } from '@/lib/auth-check'
import { moveFile, logAction } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { authorized, reason } = await verifyModerator()

    if (!authorized) {
      return NextResponse.json({ error: reason }, { status: 401 })
    }

    const { filename } = await req.json()

    if (!filename) {
      return NextResponse.json({ error: 'Falta el nombre del archivo' }, { status: 400 })
    }

    await moveFile(filename, 'pending', 'rejected')

    await logAction({
      filename,
      action: 'reject',
      from: 'pending',
      to: 'rejected',
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