import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BUCKET = 'nextjsGallery'

export async function POST(req: NextRequest) {
    try {
        const { eventId, logo } = await req.json()

        if (!eventId) {
            return NextResponse.json({ error: 'ID de evento requerido' }, { status: 400 })
        }

        // 1. Get current logo hash before updating
        const { data: currentEvent, error: fetchError } = await supabase
            .from('events')
            .select('logo')
            .eq('id', eventId)
            .single()

        if (fetchError) {
            console.error('[update-event-logo] Error fetching current event:', fetchError)
            return NextResponse.json({ error: fetchError.message }, { status: 500 })
        }

        // 2. Delete old logo from Storage if it exists
        if (currentEvent?.logo) {
            const oldLogoPath = `logos/${currentEvent.logo}.webp`
            const { error: deleteError } = await supabase.storage
                .from(BUCKET)
                .remove([oldLogoPath])

            if (deleteError) {
                console.warn('[update-event-logo] Could not delete old logo:', deleteError)
                // Don't fail the request if deletion fails, just log it
            } else {
                console.log(`[update-event-logo] ✅ Deleted old logo: ${oldLogoPath}`)
            }
        }

        // 3. Update event with new logo hash
        const { error } = await supabase
            .from('events')
            .update({ logo })
            .eq('id', eventId)

        if (error) {
            console.error('[update-event-logo] Error updating event:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        console.log(`[update-event-logo] ✅ Logo updated for event ${eventId}`)
        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[update-event-logo] Error:', err)
        return NextResponse.json({ error: 'Error al actualizar logo' }, { status: 500 })
    }
}
