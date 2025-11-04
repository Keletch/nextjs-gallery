import { NextRequest, NextResponse } from 'next/server'
import { logAction } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const entry = await req.json()

  const required = ['filename', 'action', 'from', 'to', 'device', 'browser', 'os', 'location']
  const missing = required.filter((key) => !entry[key])

  if (missing.length > 0) {
    return NextResponse.json({ error: `Faltan campos: ${missing.join(', ')}` }, { status: 400 })
  }

  try {
    await logAction(entry)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error al registrar log:', err)
    return NextResponse.json({ error: 'No se pudo registrar la acción' }, { status: 500 })
  }
}