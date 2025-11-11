import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'

export default async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // ❌ Evita tocar req en rutas que usan formData
  if (req.nextUrl.pathname.startsWith('/api/upload')) {
    return res
  }

  const supabase = createMiddlewareClient({ req, res })
  await supabase.auth.getUser()

  return res
}

// ✅ Aquí defines qué rutas deben usar este middleware
export const config = {
  matcher: ['/gallery/:path*', '/moderate/:path*', '/review/:path*'],
}