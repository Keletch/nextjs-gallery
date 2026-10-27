import 'server-only'
import { supabaseServer } from '@/lib/supabase-server'

// Vista con la que abre la galería, elegida por el moderador (tabla "ajustes", clave "vista_galeria")
export const VIEW_MODES = ['wall', 'dome', 'flight'] as const
export type ViewMode = (typeof VIEW_MODES)[number]

export function isViewMode(value: unknown): value is ViewMode {
  return typeof value === 'string' && (VIEW_MODES as readonly string[]).includes(value)
}

// Si la tabla aún no existe o falla la consulta, el muro de siempre
export async function getDefaultView(): Promise<ViewMode> {
  const { data, error } = await supabaseServer.from('ajustes').select('valor').eq('clave', 'vista_galeria').maybeSingle()
  if (error) console.error('[default-view] No se pudo leer el ajuste:', error.message)
  return isViewMode(data?.valor) ? data.valor : 'wall'
}
