'use client'
import { useEffect, useState } from 'react'
import { supabaseClient } from '../../lib/supabase-client'
import type { Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const router = useRouter()

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabaseClient.auth.getSession()
      setSession(data.session)
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
      <main className="relative min-h-screen w-full overflow-y-auto overflow-x-hidden bg-black scrollbar-hide flex items-center justify-center">
        <div className="w-full max-w-md p-8">
          <div className="bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <h2 className="text-2xl font-bold text-white mb-6 font-mono text-center">No has iniciado sesión</h2>
            <button
              onClick={handleLogin}
              className="w-full px-6 py-3 rounded-xl font-mono font-semibold text-white bg-gradient-to-r from-cyan-500/30 to-green-500/30 border-2 border-cyan-500/50 cursor-pointer transition-all duration-300 hover:scale-105 shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
            >
              Iniciar sesión con Google
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen w-full overflow-y-auto overflow-x-hidden bg-black scrollbar-hide">
      {/* Top bar */}
      <div className="fixed top-4 right-4 z-[10000] flex gap-2">
        <button
          onClick={() => router.push('/gallery')}
          className="px-4 py-2 rounded-lg font-mono font-semibold text-white bg-gray-800/40 backdrop-blur-md border border-white/10 transition-all duration-300 hover:bg-gray-800/60 hover:scale-105 cursor-pointer"
        >
          Ir a galería
        </button>
        <button
          onClick={async () => {
            if (window.confirm('¿Seguro que quieres cerrar sesión?')) {
              await handleLogout()
            }
          }}
          className="px-4 py-2 rounded-lg font-mono font-semibold text-white bg-red-500/20 backdrop-blur-md border border-red-500/30 transition-all duration-300 hover:bg-red-500/30 hover:scale-105 cursor-pointer"
        >
          Logout
        </button>
      </div>

      {/* Main content area with padding for top bar */}
      <div className="pt-20 px-4 sm:px-6 md:px-8">
        {children}
      </div>
    </main>
  )
}