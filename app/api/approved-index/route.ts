import { NextResponse } from 'next/server'
import { listFiles } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const evento = searchParams.get('evento')

  if (!evento) {
    return NextResponse.json([], { status: 400 })
  }

  const folder = `${evento}/approved`

  try {
    const files = await listFiles(folder)

    // 🧹 Solo excluir dummy.webp
    const visibles = files.filter(file => file !== 'dummy.webp')

    return NextResponse.json(visibles)
  } catch (err) {
    return NextResponse.json([], { status: 500 })
  }
}