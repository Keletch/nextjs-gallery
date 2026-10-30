import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { verifyModerator } from './auth-check'
import { hashOf } from './photos'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'nextjsGallery'

// 📤 Subir archivo a carpeta específica
export async function uploadToBucket(file: File, folder: string): Promise<string> {
    const rawName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')
    const filename = `${rawName}`
    const path = `${folder}/${filename}`

    const bytes = await file.arrayBuffer()
    const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
        contentType: file.type,
        upsert: false,
    })

    if (error) throw new Error(`Error al subir: ${error.message}`)
    return filename
}

// 🔁 Mover archivo entre carpetas
export async function moveFile(filename: string, from: string, to: string): Promise<void> {
    const source = `${from}/${filename}`
    const destination = `${to}/${filename}`

    const { error } = await supabase.storage.from(BUCKET).move(source, destination)
    if (error) throw new Error(`Error al mover: ${error.message}`)

    // Marca de aprobación: la galería abierta la recibe por Realtime y muestra (o quita) la foto
    // sin recargar. Si falla solo se pierde el aviso en vivo, la foto ya quedó movida.
    const { error: markError } = await supabase
        .from('imageInfo')
        .update({ aprobada_en: to.endsWith('/approved') ? new Date().toISOString() : null })
        .eq('imghash', hashOf(filename))
    if (markError) console.error('[moveFile] No se pudo marcar aprobada_en:', markError.message)
}

// ❌ Eliminar archivo
export async function deleteFile(filename: string, folder: string): Promise<void> {
    const path = `${folder}/${filename}`
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) throw new Error(`Error al eliminar: ${error.message}`)
}

// 📄 Listar TODO el contenido de una carpeta (Storage devuelve como máximo `limit` por página)
const PAGE_SIZE = 1000

async function listAllEntries(folder: string) {
    const entries: { name: string; metadata: Record<string, unknown> | null }[] = []
    for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data, error } = await supabase.storage.from(BUCKET).list(folder, { limit: PAGE_SIZE, offset })
        if (error) throw error
        entries.push(...(data ?? []))
        if (!data || data.length < PAGE_SIZE) return entries
    }
}

// 🗑️ Eliminar una carpeta completa con sus subcarpetas (Storage no tiene borrado por carpeta).
// `keep`: rutas completas que no se borran
export async function deleteFolder(folder: string, keep: string[] = []): Promise<void> {
    const entries = await listAllEntries(folder)
    // Sin metadata = subcarpeta
    for (const sub of entries.filter(e => !e.metadata)) await deleteFolder(`${folder}/${sub.name}`, keep)
    const paths = entries.filter(e => e.metadata).map(e => `${folder}/${e.name}`).filter(p => !keep.includes(p))
    for (let i = 0; i < paths.length; i += PAGE_SIZE) {
        const { error } = await supabase.storage.from(BUCKET).remove(paths.slice(i, i + PAGE_SIZE))
        if (error) throw new Error(`Error al eliminar: ${error.message}`)
    }
}

// 📁 Listar archivos en carpeta exacta
export async function listFiles(folder: string): Promise<string[]> {
    try {
        return (await listAllEntries(folder)).map(f => f.name)
    } catch (error) {
        console.error(`[listFiles] ❌ Error al listar ${folder}:`, error)
        return []
    }
}

// 📂 Listar carpetas raíz (eventos)
export async function listEventFolders(): Promise<string[]> {
    try {
        return (await listAllEntries(''))
            .filter((item) => !item.name.includes('.') && !item.metadata)
            .map((item) => item.name)
    } catch (error) {
        console.error('[listEventFolders] ❌ Error al listar carpetas raíz:', error)
        return []
    }
}

// 📝 Guardar log de acción
export type LogEntry = {
    filename: string
    action: string
    from: string
    to: string
    device: string
    browser: string
    os: string
    location: string
    evento: string
    moderator?: string
}

export async function logAction(entry: LogEntry): Promise<void> {
    let moderator = 'cliente'

    try {
        const { authorized, user } = await verifyModerator()
        if (authorized && user?.email) {
            moderator = user.email
        }
    } catch {
        // No hay sesión activa, se mantiene como 'cliente'
    }

    const { error } = await supabase.from('logs').insert([
        {
            ...entry,
            moderator,
            timestamp: new Date().toISOString(),
        },
    ])

    if (error) throw new Error(`Error al guardar log: ${error.message}`)
}

// 📜 Obtener logs ordenados
export async function getLogs(): Promise<LogEntry[]> {
    const { data, error } = await supabase
        .from('logs')
        .select('*')
        .order('timestamp', { ascending: false })

    if (error) throw new Error(`Error al obtener logs: ${error.message}`)
    return data || []
}

// 🔐 Generar URL firmada para descarga segura
export async function getSignedUrl(folder: string, filename: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(`${folder}/${filename}`, expiresIn)

    if (error || !data?.signedUrl) throw new Error(`Error al generar URL firmada: ${error?.message}`)
    return data.signedUrl
}

export { supabase }
