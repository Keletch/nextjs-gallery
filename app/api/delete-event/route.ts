import { NextRequest, NextResponse } from 'next/server'
import { deleteFile, deleteFolder, logAction, supabase } from '@/lib/supabase-admin'
import { verifyModerator } from '@/lib/auth-check'
import { isValidEventRoute } from '@/lib/validate'

// Imagen base que /api/create-event copia a cada evento nuevo: no se borra aunque se elimine su evento
const DUMMY_PATH = 'shift2025/thumbnails/dummy.webp'

// Elimina un evento por completo: sus fotos en Storage (todas las carpetas), sus registros en imageInfo,
// su logo (si ningún otro evento lo usa) y su fila en events. Los logs se conservan como historial.
export async function POST(req: NextRequest) {
    try {
        const { authorized, reason } = await verifyModerator()
        if (!authorized) {
            return NextResponse.json({ error: reason }, { status: 401 })
        }

        const { eventId, confirmacion } = await req.json()
        if (typeof eventId !== 'string' && typeof eventId !== 'number') {
            return NextResponse.json({ error: 'ID de evento inválido' }, { status: 400 })
        }

        const { data: evento, error: findError } = await supabase
            .from('events')
            .select('id, nombre, ruta, logo')
            .eq('id', eventId)
            .single()

        if (findError || !evento) {
            return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
        }

        // Segunda verificación del lado del servidor: el panel pide escribir la ruta del evento
        if (confirmacion !== evento.ruta) {
            return NextResponse.json({ error: 'La confirmación no coincide con la ruta del evento' }, { status: 400 })
        }

        // Una ruta vacía o rara borraría otras carpetas del bucket
        if (!isValidEventRoute(evento.ruta)) {
            return NextResponse.json({ error: 'Ruta de evento inválida' }, { status: 400 })
        }

        // Primero Storage: si falla, el evento sigue registrado y se puede reintentar
        await deleteFolder(evento.ruta, [DUMMY_PATH])

        const { error: infoError } = await supabase.from('imageInfo').delete().eq('evento', evento.ruta)
        if (infoError) {
            console.error('[delete-event] Error al eliminar imageInfo:', infoError)
            return NextResponse.json({ error: 'Se borraron las fotos, pero no sus registros. Intenta de nuevo.' }, { status: 500 })
        }

        const { error: eventError } = await supabase.from('events').delete().eq('id', evento.id)
        if (eventError) {
            console.error('[delete-event] Error al eliminar evento:', eventError)
            return NextResponse.json({ error: 'Se borraron las fotos, pero no el evento. Intenta de nuevo.' }, { status: 500 })
        }

        // El logo se guarda por hash y puede compartirlo otro evento
        if (evento.logo) {
            const { count } = await supabase.from('events').select('id', { count: 'exact', head: true }).eq('logo', evento.logo)
            if (count === 0) {
                await deleteFile(`${evento.logo}.webp`, 'logos').catch(err => console.error('[delete-event] Logo no borrado:', err))
            }
        }

        await logAction({
            filename: 'n/a',
            action: 'delete-event',
            from: evento.ruta,
            to: 'n/a',
            device: 'server',
            browser: 'n/a',
            os: 'n/a',
            location: 'n/a',
            evento: evento.ruta,
        })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[delete-event] Error:', err)
        return NextResponse.json({ error: 'No se pudo eliminar el evento' }, { status: 500 })
    }
}
