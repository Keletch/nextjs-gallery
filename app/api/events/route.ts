import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function GET(req: NextRequest) {
  const res = NextResponse.next()

  try {
    const supabase = createMiddlewareClient({ req, res })

    const { data, error } = await supabase
      .from('events')
      .select('id, nombre, ruta')
      .order('nombre', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'No se pudieron cargar los eventos' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Error interno al cargar eventos' }, { status: 500 })
  }
}