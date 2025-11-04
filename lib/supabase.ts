import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'nextjsGallery'

export async function uploadToBucket(file: File, folder: string): Promise<string> {
  const rawName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')
  const timestamp = Date.now()
  const filename = `${timestamp}-${rawName}`
  const path = `${folder}/${filename}`

  const bytes = await file.arrayBuffer()
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  })

  if (error) throw new Error(`Error al subir: ${error.message}`)
  return filename
}

export async function moveFile(filename: string, from: string, to: string): Promise<void> {
  const source = `${from}/${filename}`
  const destination = `${to}/${filename}`

  const { error } = await supabase.storage.from(BUCKET).move(source, destination)
  if (error) throw new Error(`Error al mover: ${error.message}`)
}

export async function deleteFile(filename: string, folder: string): Promise<void> {
  const path = `${folder}/${filename}`
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw new Error(`Error al eliminar: ${error.message}`)
}

export async function listFiles(folder: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list(folder)
  if (error) throw new Error(`Error al listar: ${error.message}`)
  return data?.map(f => f.name) || []
}

type LogEntry = {
  filename: string
  action: string
  from: string
  to: string
  device: string
  browser: string
  os: string
  location: string
}

export async function logAction(entry: LogEntry): Promise<void> {
  const { error } = await supabase.from('logs').insert([
    { ...entry, timestamp: new Date().toISOString() },
  ])
  if (error) throw new Error(`Error al guardar log: ${error.message}`)
}

export async function getLogs(): Promise<LogEntry[]> {
  const { data, error } = await supabase
    .from('logs')
    .select('*')
    .order('timestamp', { ascending: false })

  if (error) throw new Error(`Error al obtener logs: ${error.message}`)
  return data || []
}

export async function getSignedUrl(folder: string, filename: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(`${folder}/${filename}`, expiresIn)

  if (error || !data?.signedUrl) throw new Error(`Error al generar URL firmada: ${error?.message}`)
  return data.signedUrl
}