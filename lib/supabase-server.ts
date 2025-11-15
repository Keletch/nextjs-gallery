import { createClient } from '@supabase/supabase-js'

// Suprimir warnings de cookies en producción
if (typeof window === 'undefined') {
  const originalWarn = console.warn
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Failed to parse cookie string')) return
    originalWarn(...args)
  }
}

export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)