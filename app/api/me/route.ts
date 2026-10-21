import { NextResponse } from 'next/server'
import { verifyModerator } from '@/lib/auth-check'

// Indica al cliente si la sesión actual pertenece a un moderador.
export async function GET() {
  const { authorized } = await verifyModerator()
  return NextResponse.json({ moderator: authorized })
}
