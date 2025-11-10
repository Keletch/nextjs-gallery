import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'nextjsGallery'

function isValidImage(name: string): boolean {
  return (
    typeof name === 'string' &&
    name.trim() !== '' &&
    name !== 'dummy.webp' &&
    /\.(png|jpe?g|webp|gif)$/i.test(name)
  )
}

async function listFiles(path: string): Promise<{ filename: string; folder: string }[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list(path, {
    limit: 1000,
  })
  if (error || !data) return []
  return data
    .filter((item) => item.name && isValidImage(item.name))
    .map((item) => ({
      filename: item.name,
      folder: path,
    }))
}

async function listEventFolders(): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list('', {
    limit: 100,
  })
  if (error || !data) return []
  return data
    .filter((item) => !item.name.includes('.') && !item.metadata)
    .map((item) => item.name)
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const evento = searchParams.get('evento')

  try {
    if (evento) {
      const files = await listFiles(`${evento}/approved`)
      return NextResponse.json(files)
    } else {
      const eventos = await listEventFolders()
      const allFiles = await Promise.all(
        eventos.map((ev) => listFiles(`${ev}/approved`))
      )
      return NextResponse.json(allFiles.flat())
    }
  } catch (err) {
    console.error('Error en /api/gallery-index:', err)
    return NextResponse.json([], { status: 500 })
  }
}