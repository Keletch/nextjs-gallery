import { NextResponse } from 'next/server'
import { getLogs } from '@/lib/supabase'

export async function GET() {
  try {
    const logs = await getLogs()
    return NextResponse.json(logs)
  } catch (err) {
    console.error('Error al obtener logs:', err)
    return NextResponse.json([], { status: 500 })
  }
}