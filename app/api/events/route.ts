import { NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase-route'

export async function GET() {
  try {
    const supabase = await createRouteClient()

    const { data, error } = await supabase
      .from('events')
      .select('*') // '*' para no romper si aún no existe la columna "destacado"
      .order('nombre', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'No se pudieron cargar los eventos' }, { status: 500 })
    }

    return NextResponse.json(
      (data ?? []).map((e) => ({
        id: e.id,
        nombre: e.nombre,
        ruta: e.ruta,
        color: e.color,
        logo: e.logo,
        destacado: e.destacado === true,
        hashtags: e.hashtags ?? '',
      }))
    )
  } catch (err) {
    return NextResponse.json({ error: 'Error interno al cargar eventos' }, { status: 500 })
  }
}