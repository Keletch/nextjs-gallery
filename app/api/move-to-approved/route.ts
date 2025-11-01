import { NextRequest, NextResponse } from 'next/server'
import { rename } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  const { filename } = await req.json()
  const rejectedPath = path.join(process.cwd(), 'public/rejected', filename)
  const approvedPath = path.join(process.cwd(), 'public/approved', filename)

  try {
    await rename(rejectedPath, approvedPath)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error al mover a aprobados:', err)
    return NextResponse.json({ error: 'No se pudo mover la imagen' }, { status: 500 })
  }
}