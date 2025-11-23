import sharp from 'sharp'
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'nextjsGallery'
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_MB = 10 // Logos don't need to be huge

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function hashBuffer(buffer: Buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex')
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const file = formData.get('logo') as File

        if (!file) {
            return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 415 })
        }

        const sizeMB = file.size / (1024 * 1024)
        if (sizeMB > MAX_SIZE_MB) {
            return NextResponse.json({ error: 'Archivo demasiado grande (máx 10MB)' }, { status: 413 })
        }

        // Read file buffer
        const buffer = Buffer.from(await file.arrayBuffer())

        // Convert to webp with same quality as regular uploads (no resizing)
        const webpBuffer = await sharp(buffer)
            .webp({ quality: 95, effort: 4 })
            .toBuffer()

        // Generate hash from webp buffer
        const hash = hashBuffer(webpBuffer)
        const filename = `${hash}.webp`

        // Upload to logos folder in Storage
        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(`logos/${filename}`, webpBuffer, {
                contentType: 'image/webp',
                upsert: false,
            })

        if (uploadError) {
            if (uploadError.message.includes('already exists')) {
                // Logo already exists, just return the hash
                return NextResponse.json({ hash })
            }
            throw uploadError
        }

        return NextResponse.json({ hash })
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error('[UPLOAD-LOGO] Error:', message)
        return NextResponse.json({ error: 'Error al subir logo' }, { status: 500 })
    }
}
