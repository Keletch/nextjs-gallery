'use client'
import { useEffect, useState } from 'react'
import { supabaseClient } from '../../lib/supabase-client'
import type { Session } from '@supabase/supabase-js'
import { House, Images, LogOut } from 'lucide-react'
import Glass, { GlassButton } from '@/components/Glass'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isModerator, setIsModerator] = useState<boolean | null>(null)

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabaseClient.auth.getSession()
      setSession(data.session)

      // Verificar en el servidor que la cuenta esté en la tabla de moderadores
      if (data.session) {
        try {
          const res = await fetch('/api/me', { credentials: 'include' })
          const { moderator } = await res.json()
          setIsModerator(Boolean(moderator))
        } catch {
          setIsModerator(false)
        }
      }
    }
    getSession()
  }, [])

  const handleLogin = async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/moderate`,
      },
    })
    if (error) console.error('Error al iniciar sesión:', error.message)
  }

  const handleLogout = async () => {
    const { error } = await supabaseClient.auth.signOut()
    if (error) console.error('Error al cerrar sesión:', error.message)
    window.location.href = '/moderate'
  }

  if (!session) {
    return (
      <main className="relative flex min-h-screen w-full items-center justify-center overflow-y-auto overflow-x-hidden bg-black px-6 scrollbar-hide">
        <Glass radius={32} frost="heavy" className="w-full max-w-md p-8 text-center">
          <h2 className="mb-2 text-2xl font-semibold tracking-tight">Panel de moderación</h2>
          <p className="mb-7 text-sm text-white/55">Inicia sesión con tu cuenta de moderador</p>
          <GlassButton onClick={handleLogin} size="lg" selected className="w-full">
            Iniciar sesión con Google
          </GlassButton>
        </Glass>
      </main>
    )
  }

  if (isModerator === null) {
    return (
      <main className="relative flex min-h-screen w-full items-center justify-center bg-black">
        <p className="text-white/60">Verificando permisos...</p>
      </main>
    )
  }

  if (!isModerator) {
    return (
      <main className="relative flex min-h-screen w-full items-center justify-center overflow-y-auto overflow-x-hidden bg-black px-6 scrollbar-hide">
        <Glass radius={32} frost="heavy" className="w-full max-w-md p-8 text-center">
          <h2 className="mb-3 text-2xl font-semibold tracking-tight">Sin permisos</h2>
          <p className="mb-7 text-sm text-white/60">
            {session.user.email} no está registrado como moderador.
          </p>
          <GlassButton onClick={handleLogout} size="lg" className="w-full">
            Cerrar sesión
          </GlassButton>
        </Glass>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen w-full overflow-y-auto overflow-x-hidden bg-black scrollbar-hide">
      {/* Barra superior solo con íconos: galería e inicio en otra pestaña (para no salir del panel)
          y cerrar sesión */}
      <Glass radius={999} frost="clear" className="!fixed right-4 top-4 z-[10000] flex gap-1.5 p-1.5">
        <GlassButton as="a" href="/gallery" target="_blank" rel="noopener" aria-label="Ver galería (pestaña nueva)" title="Ver galería" className="h-10 w-10 !p-0">
          <Images className="h-5 w-5" strokeWidth={1.6} />
        </GlassButton>
        <GlassButton as="a" href="/" target="_blank" rel="noopener" aria-label="Inicio (pestaña nueva)" title="Inicio" className="h-10 w-10 !p-0">
          <House className="h-5 w-5" strokeWidth={1.6} />
        </GlassButton>
        <GlassButton
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="h-10 w-10 !p-0"
          onClick={async () => {
            if (window.confirm('¿Seguro que quieres cerrar sesión?')) {
              await handleLogout()
            }
          }}
        >
          <LogOut className="h-5 w-5" strokeWidth={1.6} />
        </GlassButton>
      </Glass>

      {/* Main content area with padding for top bar */}
      <div className="px-4 pt-20 sm:px-6 md:px-8">
        {children}
      </div>
    </main>
  )
}
