import { NextRequest, NextResponse } from 'next/server'
import { rename } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  const { filename } = await req.json()

  if (!filename) {
    return NextResponse.json({ error: 'Falta el nombre del archivo' }, { status: 400 })
  }

  const pendingPath = path.join(process.cwd(), 'public/pending', filename)
  const rejectedPath = path.join(process.cwd(), 'public/rejected', filename)

  try {
    await rename(pendingPath, rejectedPath)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error al mover a rechazadas:', err)
    return NextResponse.json({ error: 'No se pudo mover la imagen' }, { status: 500 })
  }
}