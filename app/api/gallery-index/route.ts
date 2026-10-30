import { NextResponse } from 'next/server'
import { listFiles as listFolder, listEventFolders } from '@/lib/supabase-admin'
import { isValidEventRoute } from '@/lib/validate'
import { getHiddenRoutes } from '@/lib/public-events'

function isValidImage(name: string): boolean {
  return (
    typeof name === 'string' &&
    name.trim() !== '' &&
    name !== 'dummy.webp' &&
    /\.(png|jpe?g|webp|gif)$/i.test(name)
  )
}

async function listFiles(path: string): Promise<{ filename: string; folder: string }[]> {
  return (await listFolder(path))
    .filter((name) => isValidImage(name))
    .map((filename) => ({ filename, folder: path }))
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const evento = searchParams.get('evento')

  try {
    let files: { filename: string; folder: string }[] = []

    if (evento && !isValidEventRoute(evento)) {
      return NextResponse.json([], { status: 400 })
    }

    const hidden = await getHiddenRoutes()

    if (evento) {
      files = hidden.has(evento) ? [] : await listFiles(`${evento}/approved`)
    } else {
      const eventos = (await listEventFolders()).filter((ev) => !hidden.has(ev))
      const allFiles = await Promise.all(
        eventos.map((ev) => listFiles(`${ev}/approved`))
      )
      files = allFiles.flat()
    }

    const response = NextResponse.json(files)
    // Caché corto en la CDN: una foto recién aprobada aparece al recargar en segundos (con 5 min se
    // tardaba hasta 15), y Storage se sigue listando como mucho unas pocas veces por minuto por evento
    response.headers.set('Cache-Control', 's-maxage=15, stale-while-revalidate=45')
    return response
  } catch (err) {
    console.error('Error en /api/gallery-index:', err)
    return NextResponse.json([], { status: 500 })
  }
}