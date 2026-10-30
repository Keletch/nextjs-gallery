import { NextRequest, NextResponse } from 'next/server'
import { logAction, supabase } from '@/lib/supabase-admin'
import { verifyModerator } from '@/lib/auth-check'

// Oculta o vuelve a mostrar un evento en la galería pública y al subir fotos. No borra nada.
export async function POST(req: NextRequest) {
    try {
        const { authorized, reason } = await verifyModerator()
        if (!authorized) {
            return NextResponse.json({ error: reason }, { status: 401 })
        }

        const { eventId, oculto } = await req.json()
        if ((typeof eventId !== 'string' && typeof eventId !== 'number') || typeof oculto !== 'boolean') {
            return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
        }

        // Un evento oculto no puede seguir destacado: la galería abriría en un evento que no muestra
        const { data, error } = await supabase
            .from('events')
            .update(oculto ? { oculto, destacado: false } : { oculto })
            .eq('id', eventId)
            .select('ruta')
            .single()

        if (error) {
            console.error('[set-event-hidden] Error:', error)
            const missingColumn = error.message.includes('oculto')
            return NextResponse.json(
                { error: missingColumn ? 'Falta agregar la columna "oculto" en Supabase' : 'Error al actualizar el evento' },
                { status: 500 }
            )
        }

        await logAction({
            filename: 'n/a',
            action: oculto ? 'hide-event' : 'show-event',
            from: data.ruta,
            to: 'n/a',
            device: 'server',
            browser: 'n/a',
            os: 'n/a',
            location: 'n/a',
            evento: data.ruta,
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[set-event-hidden] Error:', err)
        return NextResponse.json({ error: 'Error al actualizar el evento' }, { status: 500 })
    }
}
