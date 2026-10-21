import { NextResponse } from 'next/server'
import { listFiles } from '@/lib/supabase-admin'
import { isValidEventRoute } from '@/lib/validate'
import { verifyModerator } from '@/lib/auth-check'

export async function GET(req: Request) {
  const { authorized, reason } = await verifyModerator()
  if (!authorized) {
    return NextResponse.json({ error: reason }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const evento = searchParams.get('evento')

  if (!isValidEventRoute(evento)) {
    return NextResponse.json([], { status: 400 })
  }

  const folder = `${evento}/pending`

  try {
    const files = await listFiles(folder)

    // Excluir dummy.webp
    const visibles = files.filter(file => file !== 'dummy.webp')

    return NextResponse.json(visibles)
  } catch (err) {
    return NextResponse.json([], { status: 500 })
  }
}