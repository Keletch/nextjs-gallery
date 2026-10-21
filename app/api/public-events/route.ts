import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*') // '*' para no romper si aún no existe la columna "destacado"
            .order('nombre', { ascending: true })

        if (error || !data) {
            console.error('[public-events] Error al obtener eventos:', error)
            return NextResponse.json([], { status: 500 })
        }

        const eventos = data.map((e) => ({
            id: e.id,
            nombre: e.nombre,
            ruta: e.ruta,
            color: e.color,
            logo: e.logo,
            destacado: e.destacado === true,
        }))

        // Caché corto para que el cambio de evento destacado se refleje en ~1 minuto
        const response = NextResponse.json(eventos)
        response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
        return response
    } catch (err) {
        console.error('[public-events] Error inesperado:', err)
        return NextResponse.json([], { status: 500 })
    }
}