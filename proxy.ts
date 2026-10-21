import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export default async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req })

  // Refresca la sesión de Supabase y propaga las cookies actualizadas
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) req.cookies.set(name, value)
          res = NextResponse.next({ request: req })
          for (const { name, value, options } of cookiesToSet) res.cookies.set(name, value, options)
        },
      },
    }
  )
  await supabase.auth.getUser()

  return res
}

// ✅ Aquí defines qué rutas deben usar este middleware
export const config = {
  matcher: ['/gallery/:path*', '/moderate/:path*', '/review/:path*'],
}
