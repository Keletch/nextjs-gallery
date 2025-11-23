import { createClient } from '@supabase/supabase-js'
import { verifyModerator } from './auth-check'

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
}

// ❌ Eliminar archivo
export async function deleteFile(filename: string, folder: string): Promise<void> {
  const path = `${folder}/${filename}`
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw new Error(`Error al eliminar: ${error.message}`)
}

// 📁 Listar archivos en carpeta exacta
export async function listFiles(folder: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, { limit: 1000 })

  if (error) {
    console.error(`[listFiles] ❌ Error al listar ${folder}:`, error)
    return []
  }

  const files = data?.map(f => f.name) ?? []
  return files
}

// 📂 Listar carpetas raíz (eventos)
export async function listEventFolders(): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list('', { limit: 100 })

  if (error || !data) {
    console.error('[listEventFolders] ❌ Error al listar carpetas raíz:', error)
    return []
  }

  const folders = data
    .filter((item) => !item.name.includes('.') && !item.metadata)
    .map((item) => item.name)

  return folders
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