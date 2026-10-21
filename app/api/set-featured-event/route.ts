import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'
import { verifyModerator } from '@/lib/auth-check'

// Marca un evento como destacado (el que la galería abre por defecto).
// eventId: null quita el destacado y la galería vuelve a mostrar todos los eventos.
export async function POST(req: NextRequest) {
    try {
        const { authorized, reason } = await verifyModerator()
        if (!authorized) {
            return NextResponse.json({ error: reason }, { status: 401 })
        }

        const { eventId } = await req.json()
        if (eventId !== null && (typeof eventId !== 'string' && typeof eventId !== 'number')) {
            return NextResponse.json({ error: 'ID de evento inválido' }, { status: 400 })
        }

        // Primero quitar el actual (el índice único solo permite uno a la vez)
        const { error: clearError } = await supabase
            .from('events')
            .update({ destacado: false })
            .eq('destacado', true)

        if (clearError) {
            console.error('[set-featured-event] Error al limpiar destacado:', clearError)
            const missingColumn = clearError.message.includes('destacado')
            return NextResponse.json(
                { error: missingColumn ? 'Falta agregar la columna "destacado" en Supabase' : 'Error al actualizar evento destacado' },
                { status: 500 }
            )
        }

        if (eventId !== null) {
            const { error } = await supabase
                .from('events')
                .update({ destacado: true })
                .eq('id', eventId)

            if (error) {
                console.error('[set-featured-event] Error al destacar:', error)
                return NextResponse.json({ error: 'Error al actualizar evento destacado' }, { status: 500 })
            }
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[set-featured-event] Error:', err)
        return NextResponse.json({ error: 'Error al actualizar evento destacado' }, { status: 500 })
    }
}
