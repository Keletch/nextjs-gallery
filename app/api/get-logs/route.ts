import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const evento = searchParams.get('evento')
    const moderator = searchParams.get('moderator')
    const action = searchParams.get('action')

    let query = supabase.from('logs').select('*').order('timestamp', { ascending: false })

    if (evento) query = query.eq('evento', evento)
    if (moderator) query = query.eq('moderator', moderator)
    if (action) query = query.eq('action', action)

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    console.error('[get-logs] ❌ Error al obtener logs:', err)
    return NextResponse.json([], { status: 500 })
  }
}