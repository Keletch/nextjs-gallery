import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'
import { verifyModerator } from '@/lib/auth-check'

const BUCKET = 'nextjsGallery'
const DUMMY_PATH = 'shift2025/thumbnails/dummy.webp'

export async function POST(req: NextRequest) {
    try {
        // Verificar permisos de moderador
        const { authorized, reason } = await verifyModerator()
        if (!authorized) {
            console.warn(`[create-event] Intento no autorizado: ${reason}`)
            return NextResponse.json({ error: reason }, { status: 401 })
        }

        const { nombre, ruta, color, logo } = await req.json()

        if (!nombre || !ruta) {
            return NextResponse.json({ error: 'Faltan nombre o ruta' }, { status: 400 })
        }

        // Verificar si ya existe un evento con esa ruta
        const { data: existing, error: checkError } = await supabase
            .from('events')
            .select('id')
            .eq('ruta', ruta)
            .single()

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('[create-event] Error al verificar existencia:', checkError)
            return NextResponse.json({ error: 'Error al verificar evento existente' }, { status: 500 })
        }

        if (existing) {
            return NextResponse.json({ error: `Ya existe un evento con la ruta "${ruta}"` }, { status: 409 })
        }

        // Descargar imagen dummy
        const { data: dummyFile, error: dummyError } = await supabase.storage
            .from(BUCKET)
            .download(DUMMY_PATH)

        if (dummyError || !dummyFile) {
            console.error('[create-event] No se pudo obtener imagen dummy:', dummyError)
            return NextResponse.json({ error: 'No se encontró imagen dummy en thumbnails' }, { status: 500 })
        }

        // Crear carpetas simuladas copiando la imagen dummy
        const folders = ['approved', 'rejected', 'pending', 'thumbnails']
        for (const folder of folders) {
            const targetPath = `${ruta}/${folder}/dummy.webp`

            const { error } = await supabase.storage.from(BUCKET).upload(targetPath, dummyFile, {
                upsert: false,
            })

            if (error) {
                console.error(`[create-event] Error al crear carpeta ${folder}:`, error)
                return NextResponse.json({ error: `No se pudo crear carpeta ${folder}` }, { status: 500 })
            }
        }

        // Insertar evento en tabla con logo opcional
        const { error: insertError } = await supabase.from('events').insert([
            {
                nombre,
                ruta,
                color: color || '#000000',
                logo: logo || null
            },
        ])

        if (insertError) {
            console.error('[create-event] Error al insertar en tabla events:', insertError)
            return NextResponse.json({ error: 'No se pudo registrar el evento' }, { status: 500 })
        }
        return NextResponse.json({ success: true, evento: { nombre, ruta, logo } })
    } catch (err) {
        console.error('[create-event] Error general:', err)
        return NextResponse.json({ error: 'Error inesperado al crear evento' }, { status: 500 })
    }
}