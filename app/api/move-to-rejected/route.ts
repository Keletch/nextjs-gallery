import { NextRequest, NextResponse } from 'next/server'
import { moveFile, logAction } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { filename, from } = await req.json()

  if (!filename || !from) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
  }

  try {
    await moveFile(filename, from, 'rejected')

    await logAction({
      filename,
      action: 'move-to-rejected',
      from,
      to: 'rejected',
      device: 'server',
      browser: 'n/a',
      os: 'n/a',
      location: 'n/a',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error al mover a rejected:', err)
    return NextResponse.json({ error: 'No se pudo mover la imagen' }, { status: 500 })
  }
}