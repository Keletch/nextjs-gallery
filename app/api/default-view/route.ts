import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'
import { verifyModerator } from '@/lib/auth-check'
import { getDefaultView, isViewMode } from '@/lib/default-view'

// Vista con la que abre la galería: el panel la lee (GET) y el moderador la cambia (POST)
export async function GET() {
    const { authorized, reason } = await verifyModerator()
    if (!authorized) {
        return NextResponse.json({ error: reason }, { status: 401 })
    }
    return NextResponse.json({ view: await getDefaultView() })
}

export async function POST(req: NextRequest) {
    try {
        const { authorized, reason } = await verifyModerator()
        if (!authorized) {
            return NextResponse.json({ error: reason }, { status: 401 })
        }

        const { view } = await req.json()
        if (!isViewMode(view)) {
            return NextResponse.json({ error: 'Vista inválida' }, { status: 400 })
        }

        const { error } = await supabase
            .from('ajustes')
            .upsert({ clave: 'vista_galeria', valor: view, actualizado_en: new Date().toISOString() })

        if (error) {
            console.error('[default-view] Error al guardar:', error)
            const missingTable = error.message.includes('ajustes')
            return NextResponse.json(
                { error: missingTable ? 'Falta crear la tabla "ajustes" en Supabase' : 'Error al guardar la vista' },
                { status: 500 }
            )
        }

        return NextResponse.json({ view })
    } catch (err) {
        console.error('[default-view] Error:', err)
        return NextResponse.json({ error: 'Error al guardar la vista' }, { status: 500 })
    }
}
