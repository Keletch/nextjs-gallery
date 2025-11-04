import { NextRequest, NextResponse } from 'next/server'
import { moveFile, logAction } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { filename } = await req.json()

  if (!filename) {
    return NextResponse.json({ error: 'Falta el nombre del archivo' }, { status: 400 })
  }

  try {
    await moveFile(filename, 'pending', 'approved')

    await logAction({
      filename,
      action: 'approve',
      from: 'pending',
      to: 'approved',
      device: 'server',
      browser: 'n/a',
      os: 'n/a',
      location: 'n/a',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error al mover a aprobadas:', err)
    return NextResponse.json({ error: 'No se pudo mover la imagen' }, { status: 500 })
  }
}