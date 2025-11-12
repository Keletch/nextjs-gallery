import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('id, nombre, ruta') // ← incluye ruta para el selector
      .order('nombre', { ascending: true }) // ← orden alfabético

    if (error || !data) {
      console.error('[public-events] ❌ Error al obtener eventos:', error)
      return NextResponse.json([], { status: 500 })
    }

    const response = NextResponse.json(data)
    response.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return response
  } catch (err) {
    console.error('[public-events] ❌ Error inesperado:', err)
    return NextResponse.json([], { status: 500 })
  }
}