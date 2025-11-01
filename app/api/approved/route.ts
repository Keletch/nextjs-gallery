import { NextRequest, NextResponse } from 'next/server'
import { rename } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  const { filename } = await req.json()

  if (!filename) {
    return NextResponse.json({ error: 'Falta el nombre del archivo' }, { status: 400 })
  }

  const pendingPath = path.join(process.cwd(), 'public/pending', filename)
  const approvedPath = path.join(process.cwd(), 'public/approved', filename)

  try {
    await rename(pendingPath, approvedPath)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error al aprobar imagen:', err)
    return NextResponse.json({ error: 'No se pudo mover la imagen' }, { status: 500 })
  }
}