import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  const { filename, folder } = await req.json()
  const filePath = path.join(process.cwd(), 'public', folder, filename)

  try {
    await unlink(filePath)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Error al eliminar imagen:', err)
    return NextResponse.json({ error: 'No se pudo eliminar la imagen' }, { status: 500 })
  }
}