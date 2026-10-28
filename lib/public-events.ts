import 'server-only'
import { supabase } from '@/lib/supabase-admin'

export type PublicEvent = {
  id: string
  nombre: string
  ruta: string
  color?: string
  logo?: string
  destacado: boolean
}

// Eventos para la galería pública (los usa /api/public-events y la página de la galería en el servidor)
export async function getPublicEvents(): Promise<PublicEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*') // '*' para no romper si aún no existe la columna "destacado"
    .order('nombre', { ascending: true })

  if (error || !data) {
    console.error('[public-events] Error al obtener eventos:', error)
    throw error ?? new Error('Sin datos de eventos')
  }

  return data.map((e) => ({
    id: e.id,
    nombre: e.nombre,
    ruta: e.ruta,
    color: e.color,
    logo: e.logo,
    destacado: e.destacado === true,
  }))
}
