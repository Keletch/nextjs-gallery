import { NextResponse } from 'next/server'
import { listFiles } from '@/lib/supabase'

export async function GET() {
  try {
    const files = await listFiles('rejected')
    return NextResponse.json(files)
  } catch (err) {
    console.error('Error al listar carpeta rejected:', err)
    return NextResponse.json([], { status: 500 })
  }
}