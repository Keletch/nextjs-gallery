import { createRouteClient } from './supabase-route'

export async function verifyModerator() {
  const supabase = await createRouteClient()

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
