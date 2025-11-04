import { NextResponse } from 'next/server'
import { listFiles } from '@/lib/supabase'

export async function GET() {
  try {
    const files = await listFiles('approved')
    return NextResponse.json(files)
  } catch (err) {
    console.error('Error al listar carpeta approved:', err)
    return NextResponse.json([], { status: 500 })
  }
}