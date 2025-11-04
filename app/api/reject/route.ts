import { NextRequest, NextResponse } from 'next/server'
import { moveFile, logAction } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { filename } = await req.json()

  if (!filename) {
    return NextResponse.json({ error: 'Falta el nombre del archivo' }, { status: 400 })
  }

  try {
    // 📦 Mover de pending → rejected
    await moveFile(filename, 'pending', 'rejected')

    // 📝 Registrar en la tabla logs
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
    console.error('Error al mover a rechazadas:', err)
    return NextResponse.json({ error: 'No se pudo mover la imagen' }, { status: 500 })
  }
}