import { supabaseServer } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { folder, filename } = await req.json()

  if (!folder || !filename) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .storage
    .from('nextjsGallery')
    .createSignedUrl(`${folder}/${filename}`, 3600)

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message || 'No se pudo generar URL' }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}