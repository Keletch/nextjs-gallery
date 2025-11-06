import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function verifyModerator() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => Array.from(cookieStore.getAll()),
        setAll: (cookiesToSet) => {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { authorized: false, reason: 'No autorizado: sin sesión' }

  const { data: mod } = await supabase
    .from('moderators')
    .select('email')
    .eq('email', user.email)
    .single()

  if (!mod) return { authorized: false, reason: 'No autorizado: no es moderador' }

  return { authorized: true, user }
}