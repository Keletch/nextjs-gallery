import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'
import { verifyModerator } from '@/lib/auth-check'

const BUCKET = 'nextjsGallery'
// Los logos se guardan como `logos/<sha256>.webp` (ver /api/upload-logo)
const LOGO_HASH = /^[a-f0-9]{64}$/

export async function POST(req: NextRequest) {
    try {
        const { authorized, reason } = await verifyModerator()
        if (!authorized) {
            return NextResponse.json({ error: reason }, { status: 401 })
        }

        const { eventId, logo } = await req.json()

        if (!eventId) {
            return NextResponse.json({ error: 'ID de evento requerido' }, { status: 400 })
        }

        if (logo !== null && (typeof logo !== 'string' || !LOGO_HASH.test(logo))) {
            return NextResponse.json({ error: 'Logo inválido' }, { status: 400 })
        }

        // Get current logo hash before updating
        const { data: currentEvent, error: fetchError } = await supabase
            .from('events')
            .select('logo')
            .eq('id', eventId)
            .single()

        if (fetchError) {
            console.error('[update-event-logo] Error fetching current event:', fetchError)
            return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
        }

        // Delete old logo from Storage if it exists (solo si es un hash válido)
        if (currentEvent?.logo && LOGO_HASH.test(currentEvent.logo) && currentEvent.logo !== logo) {
            const oldLogoPath = `logos/${currentEvent.logo}.webp`
            const { error: deleteError } = await supabase.storage
                .from(BUCKET)
                .remove([oldLogoPath])

            if (deleteError) {
                console.warn('[update-event-logo] Could not delete old logo:', deleteError)
                // Don't fail the request if deletion fails, just log it
            }
        }

        // Update event with new logo hash
        const { error } = await supabase
            .from('events')
            .update({ logo })
            .eq('id', eventId)

        if (error) {
            console.error('[update-event-logo] Error updating event:', error)
            return NextResponse.json({ error: 'Error al actualizar logo' }, { status: 500 })
        }


        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[update-event-logo] Error:', err)
        return NextResponse.json({ error: 'Error al actualizar logo' }, { status: 500 })
    }
}
