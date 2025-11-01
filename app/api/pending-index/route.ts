import { NextResponse } from 'next/server'
import { readdir } from 'fs/promises'
import path from 'path'

export async function GET() {
  try {
    const dir = path.join(process.cwd(), 'public/pending')
    const files = await readdir(dir)
    return NextResponse.json(files)
  } catch (err) {
    console.error('Error al leer carpeta pending:', err)
    return NextResponse.json([], { status: 500 })
  }
}