import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
    try {
        const { eventId, color } = await req.json()

        if (!eventId) {
            return NextResponse.json({ error: 'ID de evento requerido' }, { status: 400 })
        }

        const { error } = await supabase
            .from('events')
            .update({ color })
            .eq('id', eventId)

        if (error) {
            console.error('[update-event-color] Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }


        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[update-event-color] Error:', err)
        return NextResponse.json({ error: 'Error al actualizar color' }, { status: 500 })
    }
}
