import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'
import { verifyModerator } from '@/lib/auth-check'
import { normalizeHashtags } from '@/lib/validate'

export async function POST(req: NextRequest) {
    try {
        const { authorized, reason } = await verifyModerator()
        if (!authorized) {
            return NextResponse.json({ error: reason }, { status: 401 })
        }

        const { eventId, hashtags } = await req.json()

        if (!eventId) {
            return NextResponse.json({ error: 'ID de evento requerido' }, { status: 400 })
        }

        const normalized = normalizeHashtags(hashtags)
        if (normalized === null) {
            return NextResponse.json({ error: 'Hashtags inválidos: máximo 6, solo letras, números y _' }, { status: 400 })
        }

        const { error } = await supabase
            .from('events')
            .update({ hashtags: normalized })
            .eq('id', eventId)

        if (error) {
            console.error('[update-event-hashtags] Error:', error)
            return NextResponse.json({ error: 'Error al actualizar hashtags' }, { status: 500 })
        }

        return NextResponse.json({ success: true, hashtags: normalized })
    } catch (err) {
        console.error('[update-event-hashtags] Error:', err)
        return NextResponse.json({ error: 'Error al actualizar hashtags' }, { status: 500 })
    }
}
